const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function callSupabase(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'kctfrhxtligaqxdhbevq.supabase.co',
      path: '/rest/v1/' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(b ? JSON.parse(b) : {}); }
        catch(e) { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── EXTRACTION PROMPT ──────────────────────────────────────────
const EXTRACTION_PROMPT = `You are extracting Pakistan macro market context from a morning brief or market wrap document.

Extract ALL of the following information if present:
- KSE-100 index level, daily change, year-to-date change
- SBP policy rate and any recent changes
- KIBOR rates (3M, 6M)
- Inflation (CPI) latest figure
- PKR/USD exchange rate
- Brent crude oil price and direction
- Gold price
- Any geopolitical developments affecting Pakistan markets (Middle East, Iran, Hormuz)
- Budget news or government fiscal policy
- IMF programme status
- Sector-specific news (banking, cement, fertilizer, E&P, OMC)
- Market sentiment (risk-on/risk-off)
- Key upcoming events or catalysts

Return a single clean paragraph or set of bullet points that captures everything important. 
Write it as structured intelligence for an AI stock analyst — factual, specific, with actual numbers.
Do NOT include pleasantries, headers, or formatting. Just the raw intelligence.
If something is not in the document, skip it — do not make up numbers.
Maximum 400 words.`;

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { type, data, mediaType, text } = payload;

  // Build Claude message based on input type
  let messages;

  if (type === 'text') {
    // Plain text — just send as user message
    messages = [{
      role: 'user',
      content: `${EXTRACTION_PROMPT}\n\nDOCUMENT TEXT:\n${text}`
    }];

  } else if (type === 'pdf') {
    // PDF document
    messages = [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data }
        },
        { type: 'text', text: EXTRACTION_PROMPT }
      ]
    }];

  } else if (type === 'image') {
    // Image (PNG/JPG/WEBP)
    messages = [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data }
        },
        { type: 'text', text: EXTRACTION_PROMPT }
      ]
    }];

  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type. Must be text, pdf or image.' }) };
  }

  // Call Claude
  let macro;
  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You are a financial data extraction specialist. Extract macro market intelligence accurately and concisely. Return only the extracted content — no preamble, no explanation.',
      messages
    });

    macro = result.content?.map(i => i.text || '').join('').trim();
    if (!macro) throw new Error('Claude returned empty response');

  } catch(e) {
    console.error('Claude error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Extraction failed: ' + e.message }) };
  }

  // Save to Supabase — upsert single row with id=1
  try {
    await callSupabase('macro?id=eq.1', 'PATCH', {
      content: macro,
      updated_at: new Date().toISOString()
    });
  } catch(e) {
    // If PATCH fails (row doesn't exist yet), try INSERT
    try {
      await callSupabase('macro', 'POST', {
        id: 1,
        content: macro,
        updated_at: new Date().toISOString()
      });
    } catch(e2) {
      console.error('Supabase error:', e2.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save to database' }) };
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, macro })
  };
};
