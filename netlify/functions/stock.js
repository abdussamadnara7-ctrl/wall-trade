const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };
    https.get(url, options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve(null); }
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

// ── YAHOO FINANCE STOCK DATA ───────────────────────────────────
async function getStockData(ticker) {
  const symbol = `${ticker}.KA`;

  try {
    // Try Yahoo Finance v7 quote endpoint
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=symbol,shortName,longName,regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,regularMarketPreviousClose,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,forwardPE,priceToBook,trailingAnnualDividendYield,epsTrailingTwelveMonths,sector,industry`;

    const data = await fetchJSON(url);
    const q = data?.quoteResponse?.result?.[0];

    if (!q || !q.regularMarketPrice) {
      // Try alternative Yahoo endpoint
      const url2 = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
      const data2 = await fetchJSON(url2);
      const q2 = data2?.quoteResponse?.result?.[0];
      if (!q2 || !q2.regularMarketPrice) return null;
      return buildStockObj(ticker, q2);
    }

    return buildStockObj(ticker, q);
  } catch(e) {
    console.error('Stock fetch error:', e.message);
    return null;
  }
}

function buildStockObj(ticker, q) {
  const fmt = (v, d=2) => v != null ? Number(v).toFixed(d) : 'N/A';
  const change = q.regularMarketChangePercent;

  return {
    ticker,
    name:      q.longName || q.shortName || ticker,
    sector:    q.sector || 'Pakistan Stock Exchange',
    industry:  q.industry || '',
    price:     fmt(q.regularMarketPrice),
    change:    fmt(change),
    changeAmt: fmt(q.regularMarketChange),
    high:      fmt(q.regularMarketDayHigh),
    low:       fmt(q.regularMarketDayLow),
    prevClose: fmt(q.regularMarketPreviousClose),
    volume:    q.regularMarketVolume?.toLocaleString() || 'N/A',
    week52High:fmt(q.fiftyTwoWeekHigh),
    week52Low: fmt(q.fiftyTwoWeekLow),
    marketCap: q.marketCap ? 'Rs. ' + (q.marketCap / 1e9).toFixed(1) + 'B' : 'N/A',
    dir:       change >= 0 ? 'up' : 'dn',
    pe:        q.trailingPE ? fmt(q.trailingPE) : 'N/A',
    fwdPe:     q.forwardPE ? fmt(q.forwardPE) : 'N/A',
    pb:        q.priceToBook ? fmt(q.priceToBook) : 'N/A',
    eps:       q.epsTrailingTwelveMonths ? fmt(q.epsTrailingTwelveMonths) : 'N/A',
    divYield:  q.trailingAnnualDividendYield ? (q.trailingAnnualDividendYield * 100).toFixed(2) + '%' : 'N/A',
    // These need summary endpoint - set N/A for now
    roe: 'N/A', roa: 'N/A', grossMargin: 'N/A', netMargin: 'N/A',
    currentRatio: 'N/A', debtToEquity: 'N/A', revenue: 'N/A',
    ebitda: 'N/A', fcf: 'N/A', revenueGrowth: 'N/A', earningsGrowth: 'N/A', beta: 'N/A'
  };
}

// ── VERDICT CACHE ──────────────────────────────────────────────
const verdictCache = {};
const CACHE_TTL = 6 * 60 * 60 * 1000;

function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c) return null;
  if (Date.now() - c.timestamp > CACHE_TTL) { delete verdictCache[ticker]; return null; }
  return c.data;
}
function setCache(ticker, data) {
  verdictCache[ticker] = { data, timestamp: Date.now() };
}

// ── GENERATE AI VERDICT ────────────────────────────────────────
async function generateVerdict(stockData, macroContext) {
  const cached = getCached(stockData.ticker);
  if (cached) return { ...cached, cached: true };

  const prompt = `You are a sharp financial analyst covering Pakistani equities for Wall-Trade.

LIVE DATA FOR ${stockData.ticker} — ${stockData.name}:
Sector: ${stockData.sector}
Price: PKR ${stockData.price} (${stockData.change}% today)
52-Week Range: PKR ${stockData.week52Low} – ${stockData.week52High}
Market Cap: ${stockData.marketCap} | Volume: ${stockData.volume}
P/E: ${stockData.pe}x | Fwd P/E: ${stockData.fwdPe}x | P/B: ${stockData.pb}x
EPS: PKR ${stockData.eps} | Dividend Yield: ${stockData.divYield}

PAKISTAN MACRO:
${macroContext}

Return ONLY this exact JSON (no markdown, no extra text):
{
  "verdict": "Positive",
  "score": 7,
  "headline": "Positive: one sharp reason in max 10 words",
  "body": "2-3 sentences. State the verdict clearly. Cover the 2 strongest drivers. Mention one risk. Plain English. Mobile-friendly. No buy/sell advice.",
  "insights": [
    {"icon": "📊", "value": "6.2× P/E", "label": "Below sector average — good value", "color": "green"},
    {"icon": "💰", "value": "9.4% Yield", "label": "Strong dividend income", "color": "green"},
    {"icon": "⚠️", "value": "Key Risk", "label": "Main concern for this stock", "color": "amber"}
  ],
  "signals": [
    {"label": "State-backed", "type": "purple"},
    {"label": "High dividend", "type": "green"},
    {"label": "Circular debt", "type": "red"}
  ],
  "scores": {
    "Financial health": 8,
    "Macro environment": 5,
    "Growth outlook": 5,
    "Risk level": 6
  },
  "factors": [
    {"icon": "🌍", "title": "Key factor 1", "detail": "2 sentences explaining this factor in plain English."},
    {"icon": "💸", "title": "Key factor 2", "detail": "2 sentences explaining this factor in plain English."},
    {"icon": "💱", "title": "Key factor 3", "detail": "2 sentences explaining this factor in plain English."}
  ],
  "summary": "One sentence overall summary for score card."
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: 'You are a senior PSX equity analyst. Generate accurate, specific, data-driven analysis. Always return valid JSON only.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();

    // Find JSON object in response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const verdict = JSON.parse(jsonMatch[0]);
    setCache(stockData.ticker, verdict);
    return verdict;
  } catch(e) {
    console.error('AI error:', e.message);
    // Return fallback verdict so app doesn't break
    return {
      verdict: 'Neutral',
      score: 5,
      headline: `${stockData.ticker}: analysis temporarily unavailable`,
      body: `${stockData.name} is currently trading at PKR ${stockData.price} (${stockData.change}% today). Check the Financials tab for key ratios and the Key Factors tab for detailed analysis.`,
      insights: [
        { icon: '📊', value: `PKR ${stockData.price}`, label: 'Current market price', color: 'purple' },
        { icon: '📈', value: `${stockData.change}%`, label: 'Change today', color: parseFloat(stockData.change) >= 0 ? 'green' : 'red' },
        { icon: '🏢', value: stockData.marketCap, label: 'Market capitalisation', color: 'purple' }
      ],
      signals: [{ label: stockData.sector, type: 'purple' }],
      scores: { 'Financial health': 5, 'Macro environment': 5, 'Growth outlook': 5, 'Risk level': 5 },
      factors: [
        { icon: '📋', title: 'Live data loaded', detail: `${stockData.name} data successfully fetched from PSX. AI analysis will be available shortly.` },
        { icon: '🇵🇰', title: 'Pakistan market context', detail: 'SBP policy rate at 10.50%, IMF programme active. Rate cuts support equity valuations across PSX.' },
        { icon: '⚡', title: 'Check back shortly', detail: 'Full AI analysis including sector comparison and macro impact assessment will load on next refresh.' }
      ],
      summary: `${stockData.ticker} data loaded — full AI analysis pending.`
    };
  }
}

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
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

  console.log(`Loading stock: ${cleanTicker}`);

  const stockData = await getStockData(cleanTicker);

  if (!stockData) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: `No data found for ${cleanTicker} on PSX. The market may be closed or this ticker may not be listed. Try: OGDC, PPL, HBL, MCB, ENGRO, LUCK`
      })
    };
  }

  const verdict = await generateVerdict(stockData, macroContext || '');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ stockData, verdict, timestamp: new Date().toISOString() })
  };
};
