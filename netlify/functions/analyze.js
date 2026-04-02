const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { type, ticker, ratios, question, macro } = payload;

  const ALLOWED = ['OGDC','PPL','PSO','MARI','APL','HASCOL'];
  if (!ALLOWED.includes(ticker)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ticker not supported' }) };
  }

  const prompt = type === 'verdict'
    ? `Pakistan stock analyst for retail investors. Analyse ${ticker}. Ratios: ${ratios}. Macro: ${macro}. Return ONLY valid JSON: {"headline":"max 12 words","body":"2-3 plain English sentences, why Positive Neutral or Caution, mention macro, no jargon"}`
    : `Pakistan stock analyst. Stock: ${ticker}. Ratios: ${ratios}. Macro: ${macro}. Question: "${(question||'').slice(0,300)}". Answer in 2-4 plain English sentences. No jargon. Facts only.`;

  const data = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
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
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: 200, headers, body });
      });
    });
    req.on('error', () => {
      resolve({ statusCode: 502, headers, body: JSON.stringify({ error: 'AI unavailable' }) });
    });
    req.write(data);
    req.end();
  });
};
