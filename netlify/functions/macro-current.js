const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Supabase env vars not set' }) };
  }

  const hostname = supabaseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const fetchLatest = () => new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path: '/rest/v1/macro?select=content,updated_at&order=updated_at.desc&limit=1',
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: b ? JSON.parse(b) : [] }); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });

  try {
    const { status, data } = await fetchLatest();
    if (status >= 400) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Supabase request failed' }) };
    }
    const row = Array.isArray(data) ? data[0] : null;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(row ? { content: row.content, updated_at: row.updated_at } : { content: null })
    };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Fetch failed' }) };
  }
};
