const https = require('https');

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

function fetchFMP(path, timeoutMs = 7000) {
  const key = process.env.FMP_API_KEY;
  if (!key) { console.log('NO FMP KEY'); return Promise.resolve(null); }
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => { console.log('FMP timeout:', path); resolve(null); }, timeoutMs);
    https.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`FMP ${path.slice(0,40)} → ${res.statusCode}`);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', (e) => { clearTimeout(timer); console.log('FMP error:', e.message); resolve(null); });
  });
}

// Verdict cache
const cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 mins for crypto

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (!['POST','GET'].includes(event.httpMethod)) return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  console.log('crypto-analyze called:', event.httpMethod, event.body?.slice(0,100));

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { symbol, price, change, question } = payload;
  if (!symbol) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };

  const cacheKey = question ? `q_${symbol}_${question}` : `v_${symbol}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { statusCode: 200, headers, body: JSON.stringify(cached.data) };
  }

  // Skip historical fetch (not on Starter plan)
  const extraData = {};

  const PAKISTAN_CRYPTO_CONTEXT = `Pakistan context: PKR/USD ~278, SBP has not banned crypto but it's in a grey area. Many Pakistanis use crypto for remittances and as USD hedge. P2P trading is common. Binance and other exchanges accessible. Young population (median age 22) driving adoption. Global context: Fed policy, US dollar strength, Bitcoin ETF flows, and institutional adoption all affect crypto prices significantly.`;

  let prompt;
  if (question) {
    prompt = `You are a crypto analyst. A Pakistani investor asks about ${symbol}: "${question}"\n\nCurrent price: $${price} (${change}% today)\n${extraData.weekHigh ? `7-day range: $${extraData.weekLow} - $${extraData.weekHigh}` : ''}\n\n${PAKISTAN_CRYPTO_CONTEXT}\n\nAnswer clearly in 3-4 sentences. Explain what this means for Pakistani investors. No financial advice.`;
  } else {
    prompt = `You are a crypto analyst covering ${symbol} for Pakistani retail investors on Wall-Trade.\n\nLIVE DATA:\nSymbol: ${symbol}\nPrice: $${price}\nChange today: ${change}%\n${extraData.weekHigh ? `7-day High: $${extraData.weekHigh}\n7-day Low: $${extraData.weekLow}` : ''}\n\n${PAKISTAN_CRYPTO_CONTEXT}\n\nReturn ONLY valid JSON:\n{\n  "verdict": "Bullish" or "Neutral" or "Bearish",\n  "score": <1-10>,\n  "headline": "Sharp one-line take max 12 words",\n  "body": "3 sentences. Current momentum, key driver, Pakistan-specific angle. No advice.",\n  "insights": [\n    {"icon":"📊","value":"metric","label":"explanation","color":"green"},\n    {"icon":"⚡","value":"metric","label":"explanation","color":"amber"},\n    {"icon":"🌍","value":"metric","label":"explanation","color":"purple"}\n  ],\n  "signals": [\n    {"label":"signal","type":"green"},\n    {"label":"signal","type":"amber"}\n  ],\n  "education": "2-3 sentences explaining what ${symbol} is and what drives its price. Plain English for a new Pakistani investor."\n}`;
  }

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: 'You are a concise crypto analyst. Return only valid JSON for verdicts, plain text for questions.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    
    let response;
    if (question) {
      response = { answer: raw };
    } else {
      const m = raw.match(/\{[\s\S]*\}/);
      response = m ? JSON.parse(m[0]) : { error: 'Parse failed', raw };
    }

    cache[cacheKey] = { data: response, ts: Date.now() };
    return { statusCode: 200, headers, body: JSON.stringify(response) };
  } catch(e) {
    console.error('Crypto analyze error:', e.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI unavailable' }) };
  }
};
