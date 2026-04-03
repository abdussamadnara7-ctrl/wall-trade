const https = require('https');

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

// ── HTTP HELPERS ───────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
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

// ── LIVE DATA FROM FMP ─────────────────────────────────────────
async function getLiveData(ticker) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const [quote, metrics, ratios, income, cashflow] = await Promise.all([
      httpsGet(`https://financialmodelingprep.com/api/v3/quote/${ticker}.KA?apikey=${key}`),
      httpsGet(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}.KA?apikey=${key}`),
      httpsGet(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}.KA?apikey=${key}`),
      httpsGet(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}.KA?limit=3&apikey=${key}`),
      httpsGet(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}.KA?limit=2&apikey=${key}`)
    ]);

    if (!quote || !quote[0]) return null;
    const q = quote[0];
    const m = (metrics && metrics[0]) || {};
    const r = (ratios  && ratios[0])  || {};
    const i0 = (income  && income[0])  || {};
    const i1 = (income  && income[1])  || {};
    const cf = (cashflow && cashflow[0]) || {};

    const pct = (v) => v != null ? (v * 100).toFixed(1) + '%' : 'N/A';
    const fmt = (v, d=2) => v != null ? Number(v).toFixed(d) : 'N/A';

    // Revenue growth YoY
    const revGrowth = i0.revenue && i1.revenue
      ? (((i0.revenue - i1.revenue) / Math.abs(i1.revenue)) * 100).toFixed(1) + '%'
      : 'N/A';

    return {
      // Price
      price:           fmt(q.price),
      change:          fmt(q.changesPercentage),
      yearHigh:        fmt(q.yearHigh),
      yearLow:         fmt(q.yearLow),
      avgVolume:       q.avgVolume,
      marketCap:       q.marketCap,

      // Valuation
      pe:              fmt(r.peRatioTTM),
      pb:              fmt(r.priceToBookRatioTTM),
      ps:              fmt(r.priceToSalesRatioTTM),
      ev_ebitda:       fmt(m.enterpriseValueOverEBITDATTM),
      peg:             fmt(m.pegRatioTTM),

      // Profitability
      grossMargin:     pct(r.grossProfitMarginTTM),
      ebitdaMargin:    pct(r.ebitdaMarginTTM),
      netMargin:       pct(r.netProfitMarginTTM),
      roe:             pct(r.returnOnEquityTTM),
      roa:             pct(r.returnOnAssetsTTM),
      roic:            pct(m.roicTTM),

      // Growth
      revenueGrowth:   revGrowth,
      epsGrowth:       pct(m.epsgrowthTTM),

      // Financial health
      debtToEquity:    fmt(r.debtEquityRatioTTM),
      currentRatio:    fmt(r.currentRatioTTM),
      quickRatio:      fmt(r.quickRatioTTM),
      interestCover:   fmt(m.interestCoverageTTM),
      debtToEBITDA:    fmt(m.netDebtToEBITDATTM),

      // Dividends & cash
      divYield:        pct(r.dividendYieldTTM),
      payoutRatio:     pct(r.payoutRatioTTM),
      fcfYield:        pct(m.freeCashFlowYieldTTM),
      fcf:             cf.freeCashFlow,

      // Income statement highlights
      revenue:         i0.revenue,
      ebitda:          i0.ebitda,
      netIncome:       i0.netIncome,
      eps:             fmt(r.epsTTM),
    };
  } catch(e) {
    console.error('FMP error:', e.message);
    return null;
  }
}

// ── CLASSIFY QUESTION TYPE ─────────────────────────────────────
function classifyQuestion(question, ticker) {
  const q = question.toLowerCase();

  // Financial modelling / DCF / valuation
  const isModelling = /\b(dcf|discounted cash flow|intrinsic value|fair value|target price|model|valuation|price target|what.s it worth|undervalued|overvalued|margin of safety)\b/.test(q);

  // General financial education
  const isEducational = /\b(what is|what are|explain|how does|how do|define|tell me about|difference between|why do|what does|meaning of|help me understand|teach me|how to read|what should i look for)\b/.test(q)
    && !new RegExp(`\\b(${ticker.toLowerCase()}|this stock|this company|their|its performance|its ratio)\\b`).test(q);

  // Comparison across stocks/sectors
  const isComparison = /\b(compare|vs|versus|better than|worse than|sector|industry average|peers|benchmark)\b/.test(q);

  // Pakistan macro / economy
  const isMacro = /\b(imf|sbp|interest rate|inflation|rupee|pkr|circular debt|psdp|cpec|budget|fiscal|monetary policy|current account|forex|dollar|economy|pakistan)\b/.test(q)
    && !new RegExp(`\\b(${ticker.toLowerCase()}|this stock)\\b`).test(q);

  // Risk analysis
  const isRisk = /\b(risk|downside|worst case|danger|concern|worry|threat|problem|issue|challenge)\b/.test(q);

  // Stock specific
  const isStockSpecific = new RegExp(`\\b(${ticker.toLowerCase()}|this stock|this company|their|its )\\b`).test(q)
    || /\b(should i|buy|sell|hold|invest|position|portfolio)\b/.test(q);

  if (isModelling)    return 'modelling';
  if (isMacro)        return 'macro';
  if (isComparison)   return 'comparison';
  if (isEducational)  return 'educational';
  if (isRisk)         return 'risk';
  return 'stock_specific';
}

// ── FORMAT LIVE DATA FOR PROMPT ────────────────────────────────
function formatLiveData(live, ticker) {
  if (!live) return null;
  return `
LIVE DATA FOR ${ticker} (real-time from market):
Price: PKR ${live.price} (${live.change}% today) | 52W High: ${live.yearHigh} | 52W Low: ${live.yearLow}

VALUATION:
P/E: ${live.pe}x | P/B: ${live.pb}x | P/S: ${live.ps}x | EV/EBITDA: ${live.ev_ebitda}x | PEG: ${live.peg}

PROFITABILITY:
Gross Margin: ${live.grossMargin} | EBITDA Margin: ${live.ebitdaMargin} | Net Margin: ${live.netMargin}
ROE: ${live.roe} | ROA: ${live.roa} | ROIC: ${live.roic}

GROWTH:
Revenue Growth YoY: ${live.revenueGrowth} | EPS Growth: ${live.epsGrowth}

FINANCIAL HEALTH:
Debt/Equity: ${live.debtToEquity} | Current Ratio: ${live.currentRatio} | Quick Ratio: ${live.quickRatio}
Interest Coverage: ${live.interestCover}x | Net Debt/EBITDA: ${live.debtToEBITDA}x

DIVIDENDS & CASH:
Dividend Yield: ${live.divYield} | Payout Ratio: ${live.payoutRatio} | FCF Yield: ${live.fcfYield}
Free Cash Flow: PKR ${live.fcf ? (live.fcf/1e9).toFixed(1) + 'B' : 'N/A'}

INCOME (Latest Year):
Revenue: PKR ${live.revenue ? (live.revenue/1e9).toFixed(1) + 'B' : 'N/A'}
EBITDA: PKR ${live.ebitda ? (live.ebitda/1e9).toFixed(1) + 'B' : 'N/A'}
Net Income: PKR ${live.netIncome ? (live.netIncome/1e9).toFixed(1) + 'B' : 'N/A'}
EPS: PKR ${live.eps}`;
}

// ── BUILD PROMPT BY QUESTION TYPE ─────────────────────────────
function buildPrompt(type, ticker, dataContext, liveFormatted, macro, safeQuestion, questionType) {

  if (type === 'verdict') {
    return `Analyse ${ticker} for a retail investor on Wall-Trade.

${liveFormatted || dataContext}

PAKISTAN MACRO:
${macro}

Give your sharpest, most insightful take. Return ONLY this JSON (no markdown, no extra text):
{
  "headline": "One razor-sharp sentence, max 12 words. A real analyst's take — confident, specific, memorable. Not a description.",
  "body": "3-4 sentences of genuine analysis. Weave together the financials, the Pakistan macro context, and the real investment thesis or risk. Be specific — use actual numbers. Make a clear case for why this stock is Positive, Neutral or Caution right now. Sound like you genuinely know this company."
}`;
  }

  const base = liveFormatted
    ? `${liveFormatted}\n\nPAKISTAN MACRO:\n${macro}`
    : `FINANCIAL DATA: ${dataContext}\n\nPAKISTAN MACRO:\n${macro}`;

  switch(questionType) {

    case 'modelling':
      return `A retail investor on Wall-Trade is asking about ${ticker} and wants financial modelling insight:
"${safeQuestion}"

${base}

Do a proper analytical response. Where relevant:
- Walk through key valuation metrics and what they imply about intrinsic value
- Reference sector-appropriate multiples for Pakistani listed companies
- Factor in Pakistan-specific risks (currency, political, regulatory) as discount rate adjustments
- Give a clear view on whether the stock looks cheap, fair, or expensive vs fundamentals
- Be quantitative where possible — use actual numbers from the data above
Write 4-6 sentences. Think like a CFA charterholder explaining to an intelligent non-expert.`;

    case 'macro':
      return `A retail investor asks this Pakistan macro/economy question in the context of investing:
"${safeQuestion}"

CURRENT PAKISTAN MACRO CONTEXT:
${macro}

Answer this as a macro analyst would — explain the dynamics, cause and effect, and importantly what it means for PSX investors and their portfolios. Use specific data points. Where relevant, mention which sectors or types of stocks are most affected. 4-5 sentences. No jargon but don't oversimplify.`;

    case 'educational':
      return `A retail investor using Wall-Trade (Pakistan stock analysis app) asks this general finance question:
"${safeQuestion}"

Answer this as a general educational explanation — clear, insightful, grounded in how it actually works in Pakistani markets specifically. Use Pakistani examples (PSX, SBP, PKR, specific sectors) where they help illustrate the concept. Don't anchor this answer to ${ticker} specifically — keep it broadly applicable. 3-5 sentences. The goal is genuine understanding, not textbook definitions.`;

    case 'comparison':
      return `Investor looking at ${ticker} asks a comparison question:
"${safeQuestion}"

${base}

Answer with a genuinely useful comparative perspective. Where you have data for ${ticker}, use it. For sector/peer comparisons, draw on your knowledge of Pakistani listed companies and their typical metrics. Be direct about which is stronger/weaker and why. 4-5 sentences.`;

    case 'risk':
      return `Investor is assessing risk in ${ticker} and asks:
"${safeQuestion}"

${base}

Give an honest, thorough risk assessment. Go beyond the obvious — think about:
- Balance sheet risks (leverage, liquidity, receivables quality)
- Pakistan macro risks specific to this company (currency, regulation, circular debt, IMF conditions)
- Sector-specific risks
- Corporate governance or management risks if relevant
- Probability-weight the risks — which ones are existential vs manageable
Be direct and honest. 4-6 sentences.`;

    default: // stock_specific
      return `Investor is looking at ${ticker} on Wall-Trade and asks:
"${safeQuestion}"

${base}

Answer like a brilliant analyst friend who knows this stock well — direct, specific, use the actual numbers above where relevant, connect to what's happening in Pakistan's economy right now. Give a genuinely useful, insightful answer. 3-5 sentences.`;
  }
}

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

  // Rate limit
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limit = getRateLimit(ip);
  if (limit.count >= RATE_LIMIT) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit reached. Please try again in an hour.' }) };
  }
  limit.count++;

  // Parse
  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { type, ticker, ratios, question, macro } = payload;

  // Validate
  if (!['verdict', 'question'].includes(type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type' }) };
  }
  const ALLOWED = ['OGDC','PPL','PSO','MARI','APL','HASCOL','ENGRO','HBL','LUCK','MCB','UBL','NBP','FFBL','FFC','MLCF'];
  if (!ALLOWED.includes(ticker)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ticker not supported' }) };
  }

  const safeQuestion = (question || '').replace(/[<>{}[\]\\]/g, '').slice(0, 500);

  // Get live data + classify question
  const [live] = await Promise.all([getLiveData(ticker)]);
  const liveFormatted = formatLiveData(live, ticker);
  const questionType  = type === 'question' ? classifyQuestion(safeQuestion, ticker) : 'verdict';
  const dataContext   = liveFormatted || `Financial data: ${ratios}`;

  // System prompt — the AI's core identity
  const system = `You are the core intelligence behind Wall-Trade, a premium AI-powered stock analysis platform for Pakistani retail investors. You are built on deep expertise across:

FINANCIAL ANALYSIS: DCF modelling, comparable company analysis, precedent transactions, ratio analysis, financial statement analysis, credit analysis, sector-specific KPIs.

PAKISTAN MARKETS: 15+ years of PSX coverage across Energy (OGDC, PPL, PSO, MARI, APL), Banking (HBL, MCB, UBL, NBP), Fertiliser (ENGRO, FFBL, FFC), Cement (LUCK, MLCF), and broader market dynamics.

PAKISTAN MACRO: Deep understanding of IMF programme conditionalities and their sector impacts, circular debt mechanics and transmission to corporate cash flows, SBP monetary policy transmission, PKR dynamics and their effect on import-heavy vs export-oriented companies, PSDP allocation and its impact on construction/materials sectors, energy pricing reforms and their winners/losers, political economy of economic reform in Pakistan.

YOUR COMMUNICATION STYLE:
- Speak like a brilliant, experienced friend who is a finance expert — direct, confident, occasionally opinionated, always honest
- Use actual numbers and data — never be vague when you have specifics
- Connect financial metrics to real-world business and economic realities
- Adapt your depth to the question — educational when asked to explain, analytical when asked to assess, modelling-focused when asked about valuation
- Never give generic disclaimers instead of real analysis
- When you don't have live data, be transparent but still provide the best analysis you can with what's available
- Your goal is to make every user feel like they just spoke to the smartest analyst they know`;

  const userPrompt = buildPrompt(type, ticker, ratios, liveFormatted, macro, safeQuestion, questionType);

  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    const responseBody = { ...result };
    if (live) responseBody.liveData = live;

    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
  } catch(err) {
    console.error('Anthropic error:', err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service unavailable' }) };
  }
};
