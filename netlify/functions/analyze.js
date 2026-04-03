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

  try {
    // 1 — Oil price via Yahoo Finance (no key needed)
    const oilData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=2d');
    if (oilData?.chart?.result?.[0]) {
      const r = oilData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.oil = {
          price:  current.toFixed(2),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'Brent Crude (USD/bbl)'
        };
      }
    }
  } catch(e) {}

  try {
    // 2 — Gold price
    const goldData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d');
    if (goldData?.chart?.result?.[0]) {
      const r = goldData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.gold = {
          price:  current.toFixed(0),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'Gold (USD/oz)'
        };
      }
    }
  } catch(e) {}

  try {
    // 3 — KSE-100 index (live PSX market)
    const kseData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (kseData?.chart?.result?.[0]) {
      const r = kseData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.kse100 = {
          price:  Math.round(current).toLocaleString(),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'KSE-100 Index'
        };
      }
    }
  } catch(e) {}

  try {
    // 4 — PKR/USD from ExchangeRate-API (free, no key)
    const fxData = await fetchJSON('https://open.er-api.com/v6/latest/USD');
    if (fxData?.rates?.PKR) {
      macro.pkrusd = {
        rate:  fxData.rates.PKR.toFixed(2),
        label: 'PKR per USD'
      };
    }
  } catch(e) {}

  try {
    // 5 — USD Index (DXY)
    const dxyData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=2d');
    if (dxyData?.chart?.result?.[0]) {
      const r = dxyData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.usdindex = {
          price:  current.toFixed(2),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'USD Index (DXY)'
        };
      }
    }
  } catch(e) {}

  try {
    // 6 — Pakistan financial news via free RSS feeds (unlimited, no API key)
    const RSS_FEEDS = [
      { url: 'https://www.dawn.com/feeds/business-finance', source: 'Dawn Business' },
      { url: 'https://www.brecorder.com/feeds/rss', source: 'Business Recorder' },
      { url: 'https://arynews.tv/feed/', source: 'ARY News' },
      { url: 'https://www.thenews.com.pk/rss/2/29', source: 'The News Business' },
    ];

    const rssResults = await Promise.allSettled(
      RSS_FEEDS.map(feed => fetchXML(feed.url, feed.source))
    );

    const allArticles = [];
    rssResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        allArticles.push(...r.value);
      }
    });

    // Sort by date, take top 8 most relevant
    const keywords = ['economy', 'psx', 'sbp', 'stock', 'rupee', 'pkr', 'oil', 'imf', 'budget', 'inflation', 'interest rate', 'kse', 'market', 'investment', 'sector', 'energy', 'bank', 'cement', 'fertiliser'];
    
    const scored = allArticles.map(a => {
      const text = (a.title + ' ' + (a.description || '')).toLowerCase();
      const score = keywords.filter(k => text.includes(k)).length;
      return { ...a, score };
    }).filter(a => a.score > 0).sort((a, b) => b.score - a.score || b.date - a.date);

    macro.news = scored.slice(0, 8).map(a => ({
      title: a.title,
      source: a.source,
      description: a.description?.slice(0, 150),
      publishedAt: a.publishedAt
    }));
  } catch(e) {}

  return macro;
}

// ── FORMAT MACRO CONTEXT FOR AI ────────────────────────────────
function buildMacroContext(live, staticMacro) {
  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let ctx = `=== REAL-TIME MARKET DATA (as of ${today}) ===\n\n`;

  // Live prices
  ctx += 'GLOBAL MARKETS (live):\n';
  if (live.oil)      ctx += `• Brent Crude: $${live.oil.price}/bbl (${live.oil.change > 0 ? '+' : ''}${live.oil.change}%)\n`;
  if (live.gold)     ctx += `• Gold: $${live.gold.price}/oz (${live.gold.change > 0 ? '+' : ''}${live.gold.change}%)\n`;
  if (live.pkrusd)   ctx += `• PKR/USD: ${live.pkrusd.rate}\n`;
  if (live.usdindex) ctx += `• USD Index (DXY): ${live.usdindex.price} (${live.usdindex.change > 0 ? '+' : ''}${live.usdindex.change}%)\n`;

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

// ── FMP LIVE STOCK DATA ────────────────────────────────────────
async function getLiveStockData(ticker) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const [quote, metrics, ratios] = await Promise.all([
      fetchJSON(`https://financialmodelingprep.com/api/v3/quote/${ticker}.KA?apikey=${key}`),
      fetchJSON(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}.KA?apikey=${key}`),
      fetchJSON(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}.KA?apikey=${key}`)
    ]);
    if (!quote?.[0]) return null;
    const q = quote[0], m = metrics?.[0] || {}, r = ratios?.[0] || {};
    const pct = v => v != null ? (v*100).toFixed(1)+'%' : 'N/A';
    const fmt = (v,d=2) => v != null ? Number(v).toFixed(d) : 'N/A';
    return {
      price: fmt(q.price), change: fmt(q.changesPercentage),
      yearHigh: fmt(q.yearHigh), yearLow: fmt(q.yearLow),
      pe: fmt(r.peRatioTTM), pb: fmt(r.priceToBookRatioTTM),
      ps: fmt(r.priceToSalesRatioTTM), ev_ebitda: fmt(m.enterpriseValueOverEBITDATTM),
      roe: pct(r.returnOnEquityTTM), roa: pct(r.returnOnAssetsTTM),
      roic: pct(m.roicTTM), grossMargin: pct(r.grossProfitMarginTTM),
      netMargin: pct(r.netProfitMarginTTM), ebitdaMargin: pct(r.ebitdaMarginTTM),
      debtToEquity: fmt(r.debtEquityRatioTTM), currentRatio: fmt(r.currentRatioTTM),
      quickRatio: fmt(r.quickRatioTTM), interestCover: fmt(m.interestCoverageTTM),
      divYield: pct(r.dividendYieldTTM), payoutRatio: pct(r.payoutRatioTTM),
      fcfYield: pct(m.freeCashFlowYieldTTM), eps: fmt(r.epsTTM)
    };
  } catch(e) { return null; }
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
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── BUILD AI PROMPT ────────────────────────────────────────────
function buildPrompt(type, ticker, stockData, macroContext, safeQuestion, questionType) {
  const stockCtx = stockData
    ? `LIVE STOCK DATA FOR ${ticker}:
Price: PKR ${stockData.price} (${stockData.change}% today) | 52W: ${stockData.yearLow}-${stockData.yearHigh}
Valuation: P/E ${stockData.pe}x | P/B ${stockData.pb}x | EV/EBITDA ${stockData.ev_ebitda}x
Profitability: ROE ${stockData.roe} | ROIC ${stockData.roic} | Gross Margin ${stockData.grossMargin} | Net Margin ${stockData.netMargin}
Health: D/E ${stockData.debtToEquity} | Current Ratio ${stockData.currentRatio} | Interest Cover ${stockData.interestCover}x
Income: Div Yield ${stockData.divYield} | FCF Yield ${stockData.fcfYield} | EPS PKR ${stockData.eps}`
    : '';

  if (type === 'verdict') {
    return `${macroContext}\n\n${stockCtx}\n\nGive your sharpest analyst take on ${ticker} right now, fully informed by the live market data and news headlines above.\n\nReturn ONLY this JSON (no markdown):\n{"headline":"One razor-sharp sentence, max 12 words. Real analyst confidence — specific, memorable, not generic.","body":"3-4 sentences of genuine analysis. Weave together: the stock's financials, what's happening in Pakistan's economy today, any relevant global factors (oil, rates, geopolitics) from the live data above. Be specific with numbers. Make a clear case for Positive, Neutral or Caution."}`;
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
const STATIC_MACRO = `IMF EFF programme: Active 37-month programme — energy pricing reforms, circular debt reduction, DISCO privatisation, cost-reflective tariffs are key conditions
CPI Inflation: ~8-10% (down sharply from 38% peak — disinflation well underway)
Current account: Near-balanced or slight surplus — FX reserves recovering to ~$15bn+
PSDP: Recovering as fiscal space improves with lower interest burden
PSX KSE-100: At record highs — market re-rating on macro stabilisation, rate cuts benefiting equities
Circular debt: Rs. 2.3tn+ in power sector — still structurally problematic
Geopolitical: Iran-US tensions elevated — Strait of Hormuz oil supply risk, affects Pakistan import costs
Key risks: Oil price spike (geopolitical), IMF programme slippage, political instability, rupee vulnerability`;

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
  const ALLOWED = ['OGDC','PPL','PSO','MARI','APL','HASCOL','ENGRO','HBL','LUCK','MCB','UBL','NBP','FFBL','FFC','MLCF'];
  if (!ALLOWED.includes(ticker)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ticker not supported' }) };
  }

  const safeQuestion = (question || '').replace(/[<>{}[\]\\]/g, '').slice(0, 500);

  // Fetch everything in parallel
  const [liveMacro, liveStock] = await Promise.all([
    fetchLiveMacro(),
    getLiveStockData(ticker)
  ]);

  const macroContext  = buildMacroContext(liveMacro, STATIC_MACRO);
  const questionType  = type === 'question' ? classifyQuestion(safeQuestion, ticker) : 'verdict';
  const userPrompt    = buildPrompt(type, ticker, liveStock, macroContext, safeQuestion, questionType);

  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    const responseBody = { ...result };
    if (liveStock) responseBody.liveData = liveStock;
    if (liveMacro)  responseBody.macroData = {
      oil:       liveMacro.oil,
      gold:      liveMacro.gold,
      pkrusd:    liveMacro.pkrusd,
      kse100:    liveMacro.kse100,
      newsCount: liveMacro.news?.length || 0
    };

    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
  } catch(err) {
    console.error('Anthropic error:', err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service unavailable' }) };
  }
};
