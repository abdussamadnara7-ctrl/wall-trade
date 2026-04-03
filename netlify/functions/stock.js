const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 6000);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)', ...headers }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

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

// ── FETCH FULL STOCK DATA FROM YAHOO FINANCE ──────────────────
async function getStockData(ticker) {
  const symbol = `${ticker}.KA`;

  try {
    // Get quote + key stats in one call
    const [quoteData, summaryData] = await Promise.all([
      fetchJSON(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=symbol,regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,regularMarketPreviousClose,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,forwardPE,priceToBook,trailingAnnualDividendYield,epsTrailingTwelveMonths,shortName,longName,sector,industry`),
      fetchJSON(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=financialData,defaultKeyStatistics,summaryDetail,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory`)
    ]);

    const q = quoteData?.quoteResponse?.result?.[0];
    if (!q) return null;

    const fin  = summaryData?.quoteSummary?.result?.[0]?.financialData || {};
    const stats = summaryData?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    const detail = summaryData?.quoteSummary?.result?.[0]?.summaryDetail || {};

    const pct = (v) => v?.raw != null ? (v.raw * 100).toFixed(1) + '%' : 'N/A';
    const fmt = (v, d=2) => v?.raw != null ? Number(v.raw).toFixed(d) : (typeof v === 'number' ? v.toFixed(d) : 'N/A');
    const bil = (v) => v?.raw != null ? 'Rs. ' + (v.raw / 1e9).toFixed(1) + 'B' : 'N/A';

    return {
      // Identity
      ticker,
      symbol,
      name:     q.longName || q.shortName || ticker,
      sector:   q.sector || 'Pakistan Stock Exchange',
      industry: q.industry || '',

      // Price data
      price:     q.regularMarketPrice?.toFixed(2),
      change:    q.regularMarketChangePercent?.toFixed(2),
      changeAmt: q.regularMarketChange?.toFixed(2),
      high:      q.regularMarketDayHigh?.toFixed(2),
      low:       q.regularMarketDayLow?.toFixed(2),
      prevClose: q.regularMarketPreviousClose?.toFixed(2),
      volume:    q.regularMarketVolume?.toLocaleString(),
      week52High:q.fiftyTwoWeekHigh?.toFixed(2),
      week52Low: q.fiftyTwoWeekLow?.toFixed(2),
      marketCap: q.marketCap ? 'Rs. ' + (q.marketCap / 1e9).toFixed(1) + 'B' : 'N/A',
      dir:       q.regularMarketChangePercent >= 0 ? 'up' : 'dn',

      // Valuation ratios
      pe:        q.trailingPE?.toFixed(2) || 'N/A',
      fwdPe:     q.forwardPE?.toFixed(2) || 'N/A',
      pb:        q.priceToBook?.toFixed(2) || 'N/A',
      ps:        fmt(stats.priceToSalesTrailing12Months),
      eps:       q.epsTrailingTwelveMonths?.toFixed(2) || 'N/A',
      divYield:  q.trailingAnnualDividendYield ? (q.trailingAnnualDividendYield * 100).toFixed(2) + '%' : 'N/A',

      // Profitability
      roe:         pct(fin.returnOnEquity),
      roa:         pct(fin.returnOnAssets),
      grossMargin: pct(fin.grossMargins),
      opMargin:    pct(fin.operatingMargins),
      netMargin:   pct(fin.profitMargins),
      ebitda:      bil(fin.ebitda),
      revenue:     bil(fin.totalRevenue),

      // Financial health
      currentRatio:  fmt(fin.currentRatio),
      quickRatio:    fmt(fin.quickRatio),
      debtToEquity:  fmt(fin.debtToEquity),
      totalCash:     bil(fin.totalCash),
      totalDebt:     bil(fin.totalDebt),
      fcf:           bil(fin.freeCashflow),
      beta:          fmt(stats.beta),

      // Growth
      revenueGrowth:  pct(fin.revenueGrowth),
      earningsGrowth: pct(fin.earningsGrowth),
    };
  } catch(e) {
    console.error('Stock data error:', e.message);
    return null;
  }
}

// ── VERDICT CACHE (in-memory, resets per function instance) ───
const verdictCache = {};
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c) return null;
  if (Date.now() - c.timestamp > CACHE_TTL) {
    delete verdictCache[ticker];
    return null;
  }
  return c.data;
}

function setCache(ticker, data) {
  verdictCache[ticker] = { data, timestamp: Date.now() };
}

// ── GENERATE AI VERDICT + FULL ANALYSIS ──────────────────────
async function generateVerdict(stockData, macroContext) {
  const cached = getCached(stockData.ticker);
  if (cached) return { ...cached, cached: true };

  const prompt = `You are a sharp financial analyst covering Pakistani equities for Wall-Trade, an AI-powered PSX analysis platform for retail investors.

LIVE STOCK DATA FOR ${stockData.ticker} — ${stockData.name}:
Sector: ${stockData.sector} | Industry: ${stockData.industry}
Price: PKR ${stockData.price} (${stockData.change}% today) | 52W Range: ${stockData.week52Low} – ${stockData.week52High}
Market Cap: ${stockData.marketCap} | Volume: ${stockData.volume}

VALUATION:
P/E: ${stockData.pe}x | Fwd P/E: ${stockData.fwdPe}x | P/B: ${stockData.pb}x | P/S: ${stockData.ps}x | EPS: PKR ${stockData.eps}
Dividend Yield: ${stockData.divYield}

PROFITABILITY:
ROE: ${stockData.roe} | ROA: ${stockData.roa} | Gross Margin: ${stockData.grossMargin} | Net Margin: ${stockData.netMargin}
EBITDA: ${stockData.ebitda} | Revenue: ${stockData.revenue}

FINANCIAL HEALTH:
Current Ratio: ${stockData.currentRatio} | Quick Ratio: ${stockData.quickRatio} | D/E: ${stockData.debtToEquity}
Total Cash: ${stockData.totalCash} | Total Debt: ${stockData.totalDebt} | Free Cash Flow: ${stockData.fcf}

GROWTH:
Revenue Growth: ${stockData.revenueGrowth} | Earnings Growth: ${stockData.earningsGrowth} | Beta: ${stockData.beta}

${macroContext}

Generate a complete analysis. Return ONLY this JSON (no markdown, no extra text):
{
  "verdict": "Positive" or "Neutral" or "Caution",
  "score": <number 1-10>,
  "headline": "<verdict word>: <sharp one-line reason, max 12 words>",
  "body": "<120-150 words. State verdict clearly. Cover 2-3 strongest drivers only. One meaningful risk. Connect financials to Pakistan macro. Short paragraphs, mobile-friendly. No jargon. No buy/sell advice.>",
  "insights": [
    {"icon": "<emoji>", "value": "<metric value>", "label": "<plain English explanation, max 12 words>", "color": "green|amber|red|purple"},
    {"icon": "<emoji>", "value": "<metric value>", "label": "<plain English explanation, max 12 words>", "color": "green|amber|red|purple"},
    {"icon": "<emoji>", "value": "<metric value>", "label": "<plain English explanation, max 12 words>", "color": "green|amber|red|purple"}
  ],
  "signals": [
    {"label": "<2-3 word signal>", "type": "green|amber|red|purple"}
  ],
  "scores": {
    "Financial health": <1-10>,
    "Macro environment": <1-10>,
    "Growth outlook": <1-10>,
    "Risk level": <1-10>
  },
  "factors": [
    {"icon": "<emoji>", "title": "<factor title>", "detail": "<2-3 sentences plain English explanation>"},
    {"icon": "<emoji>", "title": "<factor title>", "detail": "<2-3 sentences plain English explanation>"},
    {"icon": "<emoji>", "title": "<factor title>", "detail": "<2-3 sentences plain English explanation>"}
  ],
  "summary": "<one sentence overall summary for score card>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a senior analyst covering PSX equities. You generate accurate, data-driven analysis for retail investors in Pakistan. Always base your verdict on the actual numbers provided. Be specific — use real figures from the data. Never be generic.`,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const verdict = JSON.parse(raw);
    setCache(stockData.ticker, verdict);
    return verdict;
  } catch(e) {
    console.error('AI error:', e.message);
    return null;
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

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { ticker, macroContext } = payload;

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Fetch stock data
  const stockData = await getStockData(cleanTicker);
  if (!stockData || !stockData.price) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `No data found for ${cleanTicker} on PSX. Check the ticker symbol and try again.` })
    };
  }

  // Generate AI verdict
  const verdict = await generateVerdict(stockData, macroContext || '');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stockData,
      verdict,
      timestamp: new Date().toISOString()
    })
  };
};
