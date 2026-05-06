const https = require('https');

// ── SUPABASE ───────────────────────────────────────────────────
function supabaseRpc(fn, params) {
  return new Promise((resolve) => {
    const data = JSON.stringify(params);
    const hostname = process.env.SUPABASE_URL.replace('https://', '');
    const req = https.request({
      hostname,
      path: '/rest/v1/rpc/' + fn,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'apikey':         process.env.SUPABASE_SERVICE_KEY,
        'Authorization':  'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub || null;
  } catch(e) { return null; }
}

// ── RATE LIMITING (legacy IP-based fallback) ───────────────────
const rateLimitStore = {};
const RATE_LIMIT = 20;
const WINDOW_MS  = 60 * 60 * 1000;

function getRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitStore[ip] || now - rateLimitStore[ip].windowStart > WINDOW_MS) {
    rateLimitStore[ip] = { count: 0, windowStart: now };
  }
  return rateLimitStore[ip];
}

// ── ANTHROPIC CALL ─────────────────────────────────────────────
function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(data)
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

// ── SYSTEM PROMPT ──────────────────────────────────────────────
const SYSTEM = `You are the AI analyst behind Wall-Trade — Pakistan's stock analysis platform for retail investors.

You receive full context about a stock including live price, fundamentals, sector data, today's macro brief and any existing AI verdict. Use ALL of it to answer questions.

SECTOR RULES (apply strictly):
- BANKING: P/B is primary metric. High D/E is NORMAL — never flag it. CASA >50% is strong. Focus on ROE, NPL, CAR, rate cycle impact.
- E&P (OGDC/PPL/MARI): Brent crude = #1 earnings driver. PKR weakness = POSITIVE (USD revenues). Circular debt = cash flow risk despite strong profits.
- OMC (PSO/APL/HASCOL): 1-3% margins are NORMAL. PKR weakness = NEGATIVE. Inventory gains swing quarterly earnings. HASCOL = turnaround, not normal stock.
- FERTILIZER (FFC/EFERT/ENGROH): Dividend yield is the investment case. Gas feedstock = core margin variable. ENGROH = holding company, value from EFERT stake.
- CEMENT (LUCK/MLCF/CHCC/DGKC): Coal cost = #1 margin driver. PSDP + rate cuts drive demand. Sector overcapacity = retention price pressure.

COMMUNICATION STYLE:
- Direct, specific, always cite actual numbers from the data provided
- Connect financial metrics to Pakistan real-world context
- Mobile-friendly short paragraphs
- Never give buy or sell advice
- If you do not know something specific, say so — do not make up numbers`;

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Rate limiting
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limit = getRateLimit(ip);
  if (limit.count >= RATE_LIMIT) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit reached. Please try again in an hour.' }) };
  }
  limit.count++;

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { ticker, question, stockContext, token } = payload;

  if (!ticker || !question) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing ticker or question' }) };
  }

  // ── AUTH + RATE LIMIT ────────────────────────────────────────
  const userId = token ? decodeJWT(token) : null;
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Please sign in to use the chatbot.' }) };
  }

  const usageCheck = await supabaseRpc('check_and_increment_usage', {
    p_user_id: userId,
    p_type:    'chat'
  });

  if (!usageCheck?.allowed) {
    const tier = usageCheck?.tier || 'free';
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error:   tier === 'free'
          ? 'Chatbot is a Premium feature. Upgrade to Premium for 5 questions/day.'
          : `Daily chat limit reached (${usageCheck?.limit}/day).`,
        tier,
        upgrade: tier === 'free'
      })
    };
  }

  const safeQuestion = question.replace(/[<>{}[\]\\]/g, '').slice(0, 500);

  // stockContext is built on the frontend and contains everything:
  // - live price, change
  // - sector and fundamentals
  // - company intelligence (aiSummary)
  // - today's macro from Supabase
  // - existing verdict if generated
  const userPrompt = `${stockContext}

INVESTOR QUESTION: "${safeQuestion}"

Answer as a senior PSX analyst. Be specific, use actual numbers from the context above. 3-5 sentences. No buy/sell advice.`;

  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 600,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch(e) {
    console.error('Anthropic error:', e.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service unavailable' }) };
  }
};
