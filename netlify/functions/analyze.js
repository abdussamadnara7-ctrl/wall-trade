const https = require('https');

const rateLimitStore = {};
const RATE_LIMIT = 15;
const WINDOW_MS  = 60 * 60 * 1000;

function getRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitStore[ip] || now - rateLimitStore[ip].windowStart > WINDOW_MS) {
    rateLimitStore[ip] = { count: 0, windowStart: now };
  }
  return rateLimitStore[ip];
}

function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

async function getLiveData(ticker) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const [quote, metrics, ratios] = await Promise.all([
      httpsGet(`https://financialmodelingprep.com/api/v3/quote/${ticker}.KA?apikey=${key}`),
      httpsGet(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}.KA?apikey=${key}`),
      httpsGet(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}.KA?apikey=${key}`)
    ]);
    if (!quote || !quote[0]) return null;
    const q = quote[0], m = (metrics&&metrics[0])||{}, r = (ratios&&ratios[0])||{};
    return {
      price:        q.price?.toFixed(2),
      change:       q.changesPercentage?.toFixed(2),
      pe:           r.peRatioTTM?.toFixed(2),
      pb:           r.priceToBookRatioTTM?.toFixed(2),
      roe:          r.returnOnEquityTTM ? (r.returnOnEquityTTM*100).toFixed(1) : null,
      debtToEquity: r.debtEquityRatioTTM?.toFixed(2),
      currentRatio: r.currentRatioTTM?.toFixed(2),
      grossMargin:  r.grossProfitMarginTTM ? (r.grossProfitMarginTTM*100).toFixed(1) : null,
      divYield:     r.dividendYieldTTM ? (r.dividendYieldTTM*100).toFixed(2) : null,
      eps:          r.epsTTM?.toFixed(2),
    };
  } catch(e) { return null; }
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', chunk => { b += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limit = getRateLimit(ip);
  if (limit.count >= RATE_LIMIT) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit reached. Please try again in an hour.' }) };
  }
  limit.count++;

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { type, ticker, ratios, question, macro } = payload;

  if (!['verdict', 'question'].includes(type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type' }) };
  }

  const ALLOWED = ['OGDC','PPL','PSO','MARI','APL','HASCOL','ENGRO','HBL','LUCK','MCB','UBL','NBP','FFBL','FFC','MLCF'];
  if (!ALLOWED.includes(ticker)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ticker not supported' }) };
  }

  const safeQuestion = (question || '').replace(/[<>{}[\]\\]/g, '').slice(0, 400);

  const live = await getLiveData(ticker);
  const dataContext = live
    ? `LIVE MARKET DATA: Price PKR ${live.price} (${live.change}% today), P/E ${live.pe}x, P/B ${live.pb}x, ROE ${live.roe}%, D/E ${live.debtToEquity}, Current Ratio ${live.currentRatio}, Gross Margin ${live.grossMargin}%, Div Yield ${live.divYield}%, EPS ${live.eps}`
    : `FINANCIAL DATA: ${ratios}`;

  const system = `You are a senior investment analyst with 15 years covering the Pakistan Stock Exchange. You have deep expertise in Pakistan's macro environment — IMF programme, circular debt crisis, SBP monetary policy, rupee dynamics, PSDP cuts, energy sector challenges, and corporate governance across Pakistani companies.

You speak like a brilliant, experienced friend who happens to be a finance expert. Direct, confident, specific, occasionally opinionated — always grounded in real data. You give genuine insight, not generic disclaimers. You connect financial metrics to real-world Pakistani economic conditions in a way that actually makes sense to someone who isn't a finance professional.`;

  const userPrompt = type === 'verdict'
    ? `Give me your honest analyst take on ${ticker} right now.

${dataContext}

Pakistan macro: ${macro}

Return ONLY this JSON (no markdown):
{"headline":"Sharp confident one-liner, max 12 words, sounds like a real analyst not a robot","body":"3-4 sentences of genuine analysis. Be specific — use actual numbers, reference what's happening in Pakistan's economy right now, connect the dots between the financials and the macro. Sound like you actually know this company and have a real view on it."}`
    : `Investor is looking at ${ticker} and asks: "${safeQuestion}"

${dataContext}
Pakistan macro: ${macro}

Answer like a brilliant analyst friend — direct, specific, use real numbers, connect to Pakistan's current economic situation. 3-5 sentences. Be genuinely helpful and insightful, not vague. If there's a risk, name it clearly. If there's an opportunity, explain exactly why.`;

  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      system,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    const responseBody = { ...result };
    if (live) responseBody.liveData = live;

    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
  } catch(err) {
    console.error('Error:', err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service unavailable' }) };
  }
};
