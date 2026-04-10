// ── WALL-TRADE AUTH FUNCTION ──────────────────────────────────
// Supabase-backed sign-up with 100-user beta cap
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_KEY

const https = require('https');

function supabaseRequest(path, method, body, key, url) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const parsed = new URL(url + path);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch(e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Auth service not configured' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { action, email, password } = payload;

  // Basic validation
  if (!email || !email.includes('@') || email.length > 200) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  // ── SIGN UP ────────────────────────────────────────────────
  if (action === 'signup') {
    if (!password || password.length < 8) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    }

    // 1. Check current user count against 100-user cap
    const countRes = await supabaseRequest(
      '/rest/v1/beta_users?select=id&limit=1&count=exact',
      'GET', null, SUPABASE_KEY, SUPABASE_URL
    );

    // Supabase returns count in Content-Range header — but we check array length as fallback
    const countBody = await supabaseRequest(
      '/rest/v1/beta_users?select=count',
      'GET', null, SUPABASE_KEY, SUPABASE_URL
    );

    // Get exact count
    const exactCountRes = await supabaseRequest(
      '/rest/v1/rpc/get_beta_user_count',
      'POST', {}, SUPABASE_KEY, SUPABASE_URL
    );

    let userCount = 0;
    if (typeof exactCountRes.body === 'number') {
      userCount = exactCountRes.body;
    } else if (Array.isArray(countRes.body)) {
      userCount = countRes.body.length;
    }

    // Simple count check via users list
    const listRes = await supabaseRequest(
      '/rest/v1/beta_users?select=id',
      'GET', null, SUPABASE_KEY, SUPABASE_URL
    );
    if (Array.isArray(listRes.body)) {
      userCount = listRes.body.length;
    }

    if (userCount >= 100) {
      return {
        statusCode: 403,
        headers: CORS,
        body: JSON.stringify({
          error: 'beta_full',
          message: 'Beta is full — all 100 spots have been claimed. Join the waitlist to be notified when we expand.'
        })
      };
    }

    // 2. Check email not already registered
    const existRes = await supabaseRequest(
      `/rest/v1/beta_users?email=eq.${encodeURIComponent(email)}&select=id`,
      'GET', null, SUPABASE_KEY, SUPABASE_URL
    );
    if (Array.isArray(existRes.body) && existRes.body.length > 0) {
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ error: 'Email already registered. Try signing in.' }) };
    }

    // 3. Create Supabase Auth user
    const authRes = await supabaseRequest(
      '/auth/v1/admin/users',
      'POST',
      { email, password, email_confirm: true },
      SUPABASE_KEY, SUPABASE_URL
    );

    if (authRes.status !== 200 && authRes.status !== 201) {
      const msg = authRes.body?.msg || authRes.body?.message || 'Registration failed';
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const userId = authRes.body?.id;

    // 4. Insert into beta_users table
    if (userId) {
      await supabaseRequest(
        '/rest/v1/beta_users',
        'POST',
        { id: userId, email, signed_up_at: new Date().toISOString(), beta_slot: userCount + 1 },
        SUPABASE_KEY, SUPABASE_URL
      );
    }

    return {
      statusCode: 201,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        message: 'Account created! You are beta user #' + (userCount + 1) + ' of 100.',
        spotsLeft: 99 - userCount
      })
    };
  }

  // ── SIGN IN ────────────────────────────────────────────────
  if (action === 'signin') {
    if (!password) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Password required' }) };
    }

    const signinRes = await supabaseRequest(
      '/auth/v1/token?grant_type=password',
      'POST',
      { email, password },
      SUPABASE_KEY, SUPABASE_URL
    );

    if (signinRes.status !== 200) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    const { access_token, refresh_token, user } = signinRes.body;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        access_token,
        refresh_token,
        user: { id: user?.id, email: user?.email }
      })
    };
  }

  // ── CHECK SPOTS REMAINING ──────────────────────────────────
  if (action === 'spots') {
    const listRes = await supabaseRequest(
      '/rest/v1/beta_users?select=id',
      'GET', null, SUPABASE_KEY, SUPABASE_URL
    );
    const count = Array.isArray(listRes.body) ? listRes.body.length : 0;
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ total: 100, used: count, remaining: Math.max(0, 100 - count) })
    };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
};
