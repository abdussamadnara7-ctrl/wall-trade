const https = require('https');
const http  = require('http');

// ── RATE LIMITING ──────────────────────────────────────────────
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

// ── HTTP FETCH ─────────────────────────────────────────────────
function fetchXML(url, source, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve([]), timeoutMs);
    try {
      lib.get(url, { headers: { 'User-Agent': 'WallTrade/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          clearTimeout(timer);
          try {
            const articles = [];
            // Parse RSS items with regex (no XML parser needed)
            const items = body.match(/<item>([\s\S]*?)<\/item>/gi) || [];
            items.slice(0, 10).forEach(item => {
              const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || item.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
              const desc  = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || item.match(/<description>(.*?)<\/description>/i) || [])[1] || '';
              const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/i) || [])[1] || '';
              if (title.trim()) {
                articles.push({
                  title: title.trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"'),
                  description: desc.replace(/<[^>]*>/g,'').trim().slice(0,200).replace(/&amp;/g,'&').replace(/&#39;/g,"'"),
                  publishedAt: pubDate.trim(),
                  date: pubDate ? new Date(pubDate).getTime() : 0,
                  source
                });
              }
            });
            resolve(articles);
          } catch(e) { resolve([]); }
        });
      }).on('error', () => { clearTimeout(timer); resolve([]); });
    } catch(e) { clearTimeout(timer); resolve([]); }
  });
}

function fetchJSON(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      lib.get(url, { headers: { 'User-Agent': 'WallTrade/1.0' } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          clearTimeout(timer);
          try { resolve(JSON.parse(body)); }
          catch(e) { resolve(null); }
        });
      }).on('error', () => { clearTimeout(timer); resolve(null); });
    } catch(e) { clearTimeout(timer); resolve(null); }
  });
}

// ── LIVE MACRO DATA FETCHER ────────────────────────────────────
async function fetchLiveMacro() {
  const macro = {
    oil:      null,
    gold:     null,
    kse100:   null,
    pkrusd:   null,
    usdindex: null,
    news:     [],
    fetched:  new Date().toISOString()
  };

  const fmpKey = process.env.FMP_API_KEY;

  // 2 — Gold, Brent, PKR/USD via FMP — try multiple symbols (GCUSD/BZUSD may not be on Starter)
  if (fmpKey) {
    const fmpFetch = (sym) => fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${fmpKey}`, {}, 3000);

    // Fire ALL commodity + FX + index calls in parallel
    const fmpFetchIdx = (sym) => fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(sym)}&apikey=${fmpKey}`, 3000);
    const [gcusdR, xauR, bzusdR, usoilR, pkrR, dxyR, gspcR, vixR] = await Promise.all([
      fmpFetch('GCUSD'), fmpFetch('XAUUSD'),
      fmpFetch('BZUSD'), fmpFetch('USOIL'),
      fmpFetch('USDPKR'), fmpFetch('DX-Y.NYB'),
      fmpFetchIdx('^GSPC'), fmpFetchIdx('^VIX')
    ]);
    const pickq = (r) => Array.isArray(r) ? r[0] : r;

    // S&P 500 (proper index)
    const gspcQ = pickq(gspcR);
    if (gspcQ?.price) macro.sp500 = { price: Number(gspcQ.price).toLocaleString(), change: (gspcQ.changePercentage??0).toFixed(2), label: 'S&P 500' };

    // VIX — market fear index
    const vixQ = pickq(vixR);
    if (vixQ?.price) {
      const vixVal = Number(vixQ.price).toFixed(1);
      const vixLevel = vixQ.price > 30 ? 'EXTREME FEAR — global risk-off, EM selloff likely' :
                       vixQ.price > 20 ? 'ELEVATED — markets nervous, caution warranted' :
                       'LOW — markets calm, risk appetite positive';
      macro.vix = { price: vixVal, level: vixLevel, label: 'VIX Fear Index' };
      console.log(`VIX: ${vixVal} — ${vixLevel}`);
    }

    // Gold — first non-null result wins
    const goldQ = [gcusdR, xauR].map(pickq).find(q => q?.price > 100);
    if (goldQ) macro.gold = { price: Math.round(goldQ.price).toString(), change: (goldQ.changesPercentage??0).toFixed(2), label: 'Gold (USD/oz)' };

    // Brent — first non-null result wins
    const brentQ = [bzusdR, usoilR].map(pickq).find(q => q?.price > 20 && q.price < 300);
    if (brentQ) macro.oil = { price: Number(brentQ.price).toFixed(2), change: (brentQ.changesPercentage??0).toFixed(2), label: 'Brent Crude (USD/bbl)' };

    const pq = pickq(pkrR), dq = pickq(dxyR);
    if (pq?.price) macro.pkrusd   = { rate: Number(pq.price).toFixed(2), label: 'PKR per USD' };
    if (dq?.price) macro.usdindex = { price: Number(dq.price).toFixed(2), change: (dq.changesPercentage??0).toFixed(2), label: 'USD Index (DXY)' };
    console.log(`Macro: Gold=${macro.gold?.price||'X'} Brent=${macro.oil?.price||'X'} PKR=${macro.pkrusd?.rate||'X'}`);
  }

  // 3 — PKR fallback if FMP missed it
  if (!macro.pkrusd) {
    try {
      const fxData = await fetchJSON('https://open.er-api.com/v6/latest/USD', {}, 4000);
      if (fxData?.rates?.PKR) macro.pkrusd = { rate: fxData.rates.PKR.toFixed(2), label: 'PKR per USD' };
    } catch(e) {}
  }

  // 4 — KSE-100 from PSX Terminal + FMP news (parallel)
  const fmpNewsUrl = fmpKey
    ? `https://financialmodelingprep.com/stable/news/stock-latest?page=0&limit=20&apikey=${fmpKey}`
    : null;
  const fxNewsUrl = fmpKey
    ? `https://financialmodelingprep.com/stable/news/forex-latest?page=0&limit=10&apikey=${fmpKey}`
    : null;

  const [kseResp, stockNewsData, fxNewsData] = await Promise.all([
    fetchJSON('https://psxterminal.com/api/ticks/IDX/KSE100', 4000),
    fmpNewsUrl ? fetchJSON(fmpNewsUrl, 4000) : Promise.resolve(null),
    fxNewsUrl  ? fetchJSON(fxNewsUrl, 4000)  : Promise.resolve(null)
  ]);

  // KSE-100
  try {
    const d = kseResp?.data ?? kseResp;
    if (d?.price && Number(d.price) > 10000) {
      const pct = Math.abs(Number(d.changePercent ?? 0)) < 1
        ? Number(d.changePercent ?? 0) * 100
        : Number(d.changePercent ?? 0);
      macro.kse100 = { price: Number(d.price).toLocaleString(), change: pct.toFixed(2), dir: pct >= 0 ? 'up' : 'dn' };
      console.log(`KSE-100: ${macro.kse100.price} (${macro.kse100.change}%)`);
    }
  } catch(e) {}

  // FMP Stock News — filter for macro-relevant headlines
  const MACRO_KEYWORDS = ['oil', 'brent', 'crude', 'gold', 'pakistan', 'imf', 'federal reserve', 'fed rate',
    'dollar', 'rupee', 'emerging market', 'inflation', 'rate cut', 'rate hike', 'opec', 'china',
    'energy', 'commodity', 'interest rate', 'tariff', 'trade war', 'usd'];

  if (Array.isArray(stockNewsData)) {
    const filtered = stockNewsData
      .filter(n => n.title && MACRO_KEYWORDS.some(kw => n.title.toLowerCase().includes(kw)))
      .slice(0, 4)
      .map(n => ({ title: n.title, source: n.site || n.publisher || 'Markets', description: n.text?.slice(0, 120) || '', publishedAt: n.publishedDate }));
    macro.news.push(...filtered);
    console.log(`Stock news: ${stockNewsData.length} total, ${filtered.length} macro-relevant`);
  }

  // FMP Forex News — gold and PKR headlines always relevant
  if (Array.isArray(fxNewsData)) {
    const fxFiltered = fxNewsData
      .filter(n => n.title)
      .slice(0, 3)
      .map(n => ({ title: n.title, source: n.site || n.publisher || 'FX', description: n.text?.slice(0, 120) || '', publishedAt: n.publishedDate }));
    macro.news.push(...fxFiltered);
    console.log(`Forex news: ${fxFiltered.length} added`);
  }

  // Deduplicate news by title
  const seen = new Set();
  macro.news = macro.news.filter(n => {
    const k = n.title.slice(0, 50);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);

  console.log(`Total macro news for Claude: ${macro.news.length} headlines`);


  return macro;
}

// ── FORMAT MACRO CONTEXT FOR AI ────────────────────────────────
function buildMacroContext(live, staticMacro) {
  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let ctx = `=== REAL-TIME MARKET DATA (as of ${today}) ===\n\n`;

  // Live prices
  ctx += 'GLOBAL MARKETS (live as of today):\n';
  if (live.sp500)    ctx += `• S&P 500: ${live.sp500.price} (${Number(live.sp500.change) >= 0 ? '+' : ''}${live.sp500.change}%) — US market direction affects global risk appetite\n`;
  if (live.vix)      ctx += `• VIX Fear Index: ${live.vix.price} — ${live.vix.level}\n`;
  if (live.oil)      ctx += `• Brent Crude: $${live.oil.price}/bbl (${Number(live.oil.change) >= 0 ? '+' : ''}${live.oil.change}% today) — KEY: impacts Pakistan energy costs, OMC margins, current account\n`;
  if (live.gold)     ctx += `• Gold: $${live.gold.price}/oz (${Number(live.gold.change) >= 0 ? '+' : ''}${live.gold.change}% today) — signals global risk appetite\n`;
  if (live.pkrusd)   ctx += `• PKR/USD: ${live.pkrusd.rate} — directly affects import costs, foreign debt servicing, inflation\n`;
  if (live.usdindex) ctx += `• USD Index (DXY): ${live.usdindex.price} (${Number(live.usdindex.change) >= 0 ? '+' : ''}${live.usdindex.change}%) — stronger USD = pressure on PKR\n`;

  if (live.kse100) {
    const kseDir = parseFloat(live.kse100.change) >= 0 ? '▲' : '▼';
    const kseColor = parseFloat(live.kse100.change) >= 0 ? 'POSITIVE' : 'NEGATIVE';
    ctx += `• KSE-100 Index: ${live.kse100.price} pts (${kseDir} ${Math.abs(live.kse100.change)}% — market sentiment ${kseColor} today)\n`;
  }

  ctx += '\nPAKISTAN MONETARY POLICY (current):\n';
  ctx += '• SBP Policy Rate: 10.50% p.a.\n';
  ctx += '• Overnight Reverse Repo (ceiling): 11.50% p.a.\n';
  ctx += '• Overnight Repo (floor): 9.50% p.a.\n';
  ctx += '• Trend: Aggressive easing cycle — cut from 22% peak (2023) to 10.50% (2026)\n';

  ctx += '\nPAKISTAN MACRO (current):\n';
  ctx += staticMacro + '\n';

  // News headlines
  if (live.news?.length) {
    ctx += '\n=== LATEST NEWS HEADLINES (last 24-48 hours) ===\n';
    live.news.forEach((n, i) => {
      ctx += `${i+1}. [${n.source}] ${n.title}\n`;
      if (n.description) ctx += `   ${n.description}\n`;
    });
    ctx += '\nIMPORTANT: Factor these latest developments into your analysis where relevant.\n';
  }

  return ctx;
}

// ── LIVE STOCK DATA — uses ratios passed from frontend (hardcoded fundamentals) ──
// Note: FMP PSX.KA endpoints are not available on Starter plan
// Fundamentals come from app.html DATA object, live price from PSX Terminal via frontend
function buildStockContext(ticker, ratios) {
  if (!ratios || !Object.keys(ratios).length) return '';
  return `STOCK DATA FOR ${ticker}:
Price: PKR ${ratios.price || 'N/A'} (${ratios.chg || 'N/A'}% today)
P/E: ${ratios.pe || 'N/A'}x | P/B: ${ratios.pb || 'N/A'}x | EV/EBITDA: ${ratios.ev_ebitda || 'N/A'}x
ROE: ${ratios.roe || 'N/A'} | Net Margin: ${ratios.netMargin || 'N/A'} | Div Yield: ${ratios.divYield || 'N/A'}
D/E: ${ratios.debtToEquity || 'N/A'} | Current Ratio: ${ratios.currentRatio || 'N/A'}`;
}

// ── QUESTION CLASSIFIER ────────────────────────────────────────
function classifyQuestion(question, ticker) {
  const q = question.toLowerCase();
  const t = ticker.toLowerCase();
  const mentionsStock = new RegExp(`\\b(${t}|this stock|this company|its |their |here)\\b`).test(q);

  if (/\b(dcf|discounted cash flow|intrinsic value|fair value|target price|valuation|price target|worth|undervalued|overvalued|margin of safety|wacc|terminal value)\b/.test(q)) return 'modelling';
  if (/\b(imf|sbp|interest rate|inflation|rupee|pkr|circular debt|psdp|cpec|budget|fiscal|monetary|current account|forex|dollar|economy|pakistan|policy rate|devaluation|iran|war|geopolit|oil supply|fed rate|federal reserve)\b/.test(q) && !mentionsStock) return 'macro';
  if (/\b(compare|vs|versus|better than|worse than|sector|industry|peers|benchmark|relative)\b/.test(q)) return 'comparison';
  if (/\b(risk|downside|worst case|danger|concern|worry|threat|problem|issue|challenge|bearish|negative)\b/.test(q) && mentionsStock) return 'risk';
  if (mentionsStock) return 'stock_specific';

  // Default: any general question without stock reference = educational
  return 'educational';
}

// ── ANTHROPIC CALL ─────────────────────────────────────────────
function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    // Hard timeout — Netlify kills at 26s, so we must resolve before then
    const hardTimeout = setTimeout(() => reject(new Error('Anthropic timeout after 18s')), 18000);
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
      res.on('data', chunk => { b += chunk; });
      res.on('end', () => {
        clearTimeout(hardTimeout);
        try { resolve(JSON.parse(b)); } catch(e) { reject(e); }
      });
    });
    req.on('error', e => { clearTimeout(hardTimeout); reject(e); });
    req.write(data);
    req.end();
  });
}

// ── BUILD AI PROMPT ────────────────────────────────────────────
function buildPrompt(type, ticker, stockCtx, macroContext, safeQuestion, questionType) {
  // stockCtx is already a formatted string from buildStockContext()

  if (type === 'verdict') {
    return `${macroContext}\n\n${stockCtx}\n\nGive your sharpest analyst take on ${ticker} right now, fully informed by the live market data and news headlines above.\n\nReturn ONLY valid JSON (no markdown, no backticks, no extra text):\n{\n  "verdict": "Positive",\n  "score": 7,\n  "headline": "Positive: one razor-sharp reason max 12 words",\n  "body": "3-4 sentences. Weave stock financials + Pakistan macro today + global factors from live data above. Specific numbers. Clear Positive/Neutral/Caution case. No buy/sell advice.",\n  "insights": [\n    {"icon":"📊","value":"key metric with unit","label":"plain explanation max 10 words","color":"green"},\n    {"icon":"💰","value":"key metric with unit","label":"plain explanation max 10 words","color":"green"},\n    {"icon":"⚠️","value":"key risk","label":"plain explanation max 10 words","color":"amber"}\n  ],\n  "signals": [\n    {"label":"2-3 word signal","type":"green"},\n    {"label":"2-3 word signal","type":"amber"},\n    {"label":"2-3 word signal","type":"purple"}\n  ],\n  "scores": {"Financial health":7,"Macro environment":5,"Growth outlook":6,"Risk level":6},\n  "factors": [\n    {"icon":"🌍","title":"Factor title","detail":"2 sentences plain English explaining this factor."},\n    {"icon":"💸","title":"Factor title","detail":"2 sentences plain English explaining this factor."},\n    {"icon":"💱","title":"Factor title","detail":"2 sentences plain English explaining this factor."}\n  ],\n  "summary": "One sentence overall summary for score card."\n}`;
  }

  const base = `${macroContext}\n\n${stockCtx}`;

  switch(questionType) {
    case 'modelling':
      return `${base}\n\nA retail investor in Pakistan asks about ${ticker}: "${safeQuestion}"\n\nRespond like a smart financial guide explaining valuation simply. Use the live data above. Walk through what the key multiples (P/E, P/B, EV/EBITDA) suggest about whether the stock looks cheap or expensive. Explain Pakistan-specific risks that affect the valuation. Define any technical terms you use. Keep it concise and easy to scan on mobile. Short paragraphs only. Do not give direct buy, sell, or hold advice.`;

    case 'macro':
      return `${macroContext}\n\nInvestor asks: "${safeQuestion}"\n\nAnswer as a macro analyst — explain the dynamics and cause-effect using the LIVE DATA above (today's oil price, PKR rate, news headlines). What does this mean for PSX investors and their portfolios today specifically? Which sectors win or lose? 4-5 sentences.`;

    case 'educational':
      return `${macroContext}\n\nA retail investor asks this general finance/investment question: "${safeQuestion}"\n\nAnswer this as a clear educational explanation. Do NOT anchor to ${ticker} or any specific stock. Use Pakistani market examples (PSX, SBP, PKR, specific sectors) where helpful. Reference today's live market context from above where relevant. Genuinely useful, no jargon. 3-5 sentences.`;

    case 'comparison':
      return `${base}\n\nInvestor asks: "${safeQuestion}"\n\nGive a genuinely useful comparative perspective using the live data above. Be direct about which is stronger/weaker and why. Reference today's market context where relevant. 4-5 sentences.`;

    case 'risk':
      return `${base}\n\nInvestor asks about risk in ${ticker}: "${safeQuestion}"\n\nGive an honest layered risk assessment using today's live data above — balance sheet risks, Pakistan macro risks (including any relevant news from today), sector risks, geopolitical risks (oil supply, Iran-US). Probability-weight which are existential vs manageable. 4-6 sentences.`;

    default:
      return `${base}\n\nInvestor asks about ${ticker}: "${safeQuestion}"\n\nAnswer like a brilliant analyst friend with full access to today's live market data above. Direct, specific, use real numbers. Connect to what's actually happening in Pakistan's economy and global markets right now. 3-5 sentences.`;
  }
}

// ── SYSTEM PROMPT ──────────────────────────────────────────────
const SYSTEM = `You are the intelligence engine behind Wall-Trade — a premium AI-powered stock analysis platform for Pakistani retail investors. You replace the noise of WhatsApp broker groups with accurate, real-time, data-driven analysis.

You have two modes depending on the request:
1. VERDICT MODE: Sharp, concise financial analyst covering Pakistani equities. Data-driven, specific, no fluff.
2. GUIDE MODE: Smart, approachable financial guide for retail investors. Simple language, educational, practical.

YOUR EXPERTISE:
- PSX market dynamics across Energy, Banking, Fertiliser, Cement, Textile sectors
- Pakistan macro: IMF programme mechanics, circular debt transmission, SBP monetary policy, PKR dynamics, CPEC, PSDP allocation, political economy of reform
- Global factors affecting Pakistan: crude oil (Brent/WTI), USD strength, Fed policy, Middle East geopolitics, China economy
- Financial analysis: ratio analysis, DCF valuation, comparable company analysis, financial statement analysis, sector-specific KPIs
- Corporate governance and sector-specific dynamics of major PSX-listed companies

YOUR COMMUNICATION STYLE:
- You always have access to today's live market data — use it. Reference actual current prices, rates, and news
- Speak like the smartest analyst friend the user has — direct, confident, specific, occasionally opinionated
- Use real numbers from the data provided — never be vague when you have specifics
- Connect financial metrics to real-world business realities in Pakistan
- When answering general questions, answer them generally — do not force answers back to the specific stock being viewed unless explicitly asked
- Your goal: every user feels they just got better analysis than any WhatsApp broker could give them

CRITICAL ANALYTICAL FRAMEWORK — ALWAYS APPLY:
When any macro event occurs (petrol price change, oil spike, rate decision, currency move, geopolitical event), think through ALL affected sectors and stocks — not just the obviously related ones. For example:
- Petrol/energy price increase: affects OMCs directly, BUT ALSO cement (fuel costs), fertiliser (gas feedstock), transport costs across all sectors, consumer spending power, CPI/inflation, SBP rate expectations
- PKR depreciation: hurts importers (PSO, cement), helps exporters, increases rupee value of dollar-linked revenues (OGDC, PPL)
- Rate cuts: benefits leveraged companies, hurts dividend stocks vs fixed income, boosts construction/PSDP
- Oil price spike: direct hit on Pakistan's current account, puts pressure on PKR, benefits E&P companies (OGDC, PPL, MARI) but hurts OMCs on margins
Always connect macro events to their full chain of consequences across the PSX — not just the first-order obvious effect.`;

// ── STATIC MACRO CONTEXT ───────────────────────────────────────
const STATIC_MACRO = `PAKISTAN MACRO — April 2026:
IMF Programme: 37-month EFF active, 4th review completed successfully — $7bn programme on track, next tranche expected
Policy Rate: SBP at 10.50% — down from 22% peak, aggressive easing cycle, rate cuts benefit equity valuations
CPI Inflation: ~8-9% (peaked at 38% in 2023, well under control now — real rates still positive)
PKR: Stable at 278-280/USD — FX reserves ~$11-12bn, near 3 months of import cover
Current Account: Near-balanced — remittances strong ($30bn+ annual run rate), import compression easing
KSE-100: At/near record highs (118,000+ range) — foreign investor return, rate cut re-rating
Circular Debt: Rs 2.4tn power sector — DISCO privatisation pledged, still structural risk
CPEC Phase 2: Infrastructure investment continuing, Chinese FDI positive for construction/cement
Global Risks to Pakistan: Oil price spike (Strait of Hormuz), USD strengthening vs EM, China slowdown
US Tariffs (April 2026): Trump tariff escalation causing global market volatility — risk-off sentiment, commodity price pressure`;

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

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limit = getRateLimit(ip);
  if (limit.count >= RATE_LIMIT) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit reached. Please try again in an hour.' }) };
  }
  limit.count++;

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { type, ticker, ratios, question } = payload;

  if (!['verdict', 'question'].includes(type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type' }) };
  }
  const ALLOWED = ['OGDC','PPL','PSO','MARI','APL','HASCOL','ENGROH','HBL','LUCK','MCB','UBL','NBP','ABL','BAFL','FFC','EFERT','MLCF','CHCC','DGKC'];
  if (!ALLOWED.includes(ticker)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ticker not supported' }) };
  }

  const safeQuestion = (question || '').replace(/[<>{}[\]\\]/g, '').slice(0, 500);

  // Fetch macro — cap at 5s total so Claude always gets called
  const liveMacro = await Promise.race([
    fetchLiveMacro(),
    new Promise(r => setTimeout(() => r({}), 5000))
  ]);
  const stockCtx  = buildStockContext(ticker, ratios);

  const macroContext  = buildMacroContext(liveMacro, STATIC_MACRO);
  const questionType  = type === 'question' ? classifyQuestion(safeQuestion, ticker) : 'verdict';
  const userPrompt    = buildPrompt(type, ticker, stockCtx, macroContext, safeQuestion, questionType);

  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 700,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    const responseBody = { ...result };
    if (liveMacro) responseBody.macroData = {
      oil:       liveMacro.oil,
      gold:      liveMacro.gold,
      pkrusd:    liveMacro.pkrusd,
      kse100:    liveMacro.kse100,
      sp500:     liveMacro.sp500,
      vix:       liveMacro.vix,
      newsCount: liveMacro.news?.length || 0
    };

    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
  } catch(err) {
    console.error('Anthropic error:', err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service unavailable' }) };
  }
};
