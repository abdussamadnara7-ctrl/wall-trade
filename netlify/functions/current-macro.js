// ── WALL-TRADE CURRENT MACRO FUNCTION ─────────────────────────
// Returns the most recent macro brief from Supabase.
// Used by the admin page so Supabase credentials stay server-side.
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_KEY)

const https = require('https');

function supabaseGet(path, key, url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url + path);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
      }
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET')     return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  try {
    const res = await supabaseGet(
      '/rest/v1/macro?select=content,updated_at&order=updated_at.desc&limit=1',
      SUPABASE_KEY, SUPABASE_URL
    );
    if (res.status >= 400) {
      return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: 'Supabase request failed' }) };
    }
    const row = Array.isArray(res.body) ? res.body[0] : null;
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(row ? { content: row.content, updated_at: row.updated_at } : {})
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
