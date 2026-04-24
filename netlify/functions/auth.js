// ── WALL-TRADE AUTH FUNCTION ──────────────────────────────────
// Supabase-backed sign-up with 100-user beta cap
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, NOTIFY_EMAIL (optional)

const https = require('https');

const BETA_CAP = 100;

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
        // Ask Supabase to return exact count in response header
        'Prefer':        method === 'GET' ? 'count=exact' : 'return=representation',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          // Extract exact count from Content-Range header e.g. "0-99/47"
          const contentRange = res.headers['content-range'];
          let exactCount = null;
          if (contentRange) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) exactCount = parseInt(match[1], 10);
          }
          resolve({
            status:     res.statusCode,
            body:       JSON.parse(b),
            exactCount  // populated for GET requests with count=exact
          });
        } catch(e) {
          resolve({ status: res.statusCode, body: b, exactCount: null });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── GET EXACT BETA USER COUNT ──────────────────────────────────
// Uses Supabase Content-Range header — most reliable method
// Falls back to array length if header missing
async function getBetaUserCount(key, url) {
  try {
    const res = await supabaseRequest(
      '/rest/v1/beta_users?select=id&limit=1',
      'GET', null, key, url
    );
    // Prefer the exact count from Content-Range header
    if (res.exactCount !== null && !isNaN(res.exactCount)) {
      console.log(`Beta user count (Content-Range): ${res.exactCount}`);
      return res.exactCount;
    }
    // Fallback: fetch all IDs and count array
    const allRes = await supabaseRequest(
      '/rest/v1/beta_users?select=id&limit=200',
      'GET', null, key, url
    );
    const count = Array.isArray(allRes.body) ? allRes.body.length : 0;
    console.log(`Beta user count (array fallback): ${count}`);
    return count;
  } catch(e) {
    console.error('Count error:', e.message);
    return 0;
  }
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

  if (action !== 'spots' && (!email || !email.includes('@') || email.length > 200)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  // ── CHECK SPOTS REMAINING ──────────────────────────────────
  if (action === 'spots') {
    const count = await getBetaUserCount(SUPABASE_KEY, SUPABASE_URL);
    const remaining = Math.max(0, BETA_CAP - count);
    console.log(`Spots check: ${count} used, ${remaining} remaining`);
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        total: BETA_CAP,
        used: count,
        remaining,
        isFull: count >= BETA_CAP,
        percentFull: Math.round((count / BETA_CAP) * 100)
      })
    };
  }

  // ── SIGN UP ────────────────────────────────────────────────
  if (action === 'signup') {
    if (!password || password.length < 8) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    }

    // 1. Get reliable user count
    const userCount = await getBetaUserCount(SUPABASE_KEY, SUPABASE_URL);
    console.log(`Signup attempt — current count: ${userCount}/${BETA_CAP}`);

    if (userCount >= BETA_CAP) {
      console.log(`Beta full — rejecting signup for ${email}`);
      return {
        statusCode: 403,
        headers: CORS,
        body: JSON.stringify({
          error: 'beta_full',
          message: 'Beta is full — all 100 spots have been claimed.'
        })
      };
    }

    // 2. Check email not already registered
    const existRes = await supabaseRequest(
      `/rest/v1/beta_users?email=eq.${encodeURIComponent(email)}&select=id`,
      'GET', null, SUPABASE_KEY, SUPABASE_URL
    );
    if (Array.isArray(existRes.body) && existRes.body.length > 0) {
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ error: 'Email already registered. Please sign in.' }) };
    }

    // 3. Create Supabase Auth user
    const authRes = await supabaseRequest(
      '/auth/v1/admin/users',
      'POST',
      { email, password, email_confirm: true },
      SUPABASE_KEY, SUPABASE_URL
    );

    if (authRes.status !== 200 && authRes.status !== 201) {
      const msg = authRes.body?.msg || authRes.body?.message || authRes.body?.error_description || 'Registration failed';
      console.error(`Auth user creation failed for ${email}: ${msg}`);
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const userId = authRes.body?.id;
    const betaSlot = userCount + 1;

    // 4. Insert into beta_users table
    if (userId) {
      const insertRes = await supabaseRequest(
        '/rest/v1/beta_users',
        'POST',
        {
          id:           userId,
          email,
          signed_up_at: new Date().toISOString(),
          beta_slot:    betaSlot
        },
        SUPABASE_KEY, SUPABASE_URL
      );
      console.log(`beta_users insert status: ${insertRes.status} — slot #${betaSlot}`);
    }

    // 5. Log milestone alerts
    const spotsLeft = BETA_CAP - betaSlot;
    if (betaSlot >= BETA_CAP) {
      console.log(`🚨 BETA FULL — user #${betaSlot} just signed up (${email}). Beta cap reached.`);
    } else if (spotsLeft <= 10) {
      console.log(`⚠️ BETA NEARLY FULL — ${spotsLeft} spots left. Latest signup: ${email} (slot #${betaSlot})`);
    } else {
      console.log(`✅ New beta user #${betaSlot}: ${email} — ${spotsLeft} spots remaining`);
    }

    return {
      statusCode: 201,
      headers: CORS,
      body: JSON.stringify({
        success:   true,
        message:   `Welcome to Wall-Trade beta! You are user #${betaSlot} of ${BETA_CAP}.`,
        betaSlot,
        spotsLeft
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
      console.log(`Signin failed for ${email}: status ${signinRes.status}`);
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    const { access_token, refresh_token, user } = signinRes.body;
    console.log(`Signin success: ${email}`);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success:       true,
        access_token,
        refresh_token,
        user: { id: user?.id, email: user?.email }
      })
    };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
};
