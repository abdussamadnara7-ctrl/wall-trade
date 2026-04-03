const https = require('https');

function fetchJSON(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://psxterminal.com',
        'Referer': 'https://psxterminal.com/'
      }
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

// ── PSX TERMINAL - FULL STOCK DATA ────────────────────────────
async function getStockData(ticker) {
  try {
    // Fetch price + fundamentals in parallel
    const [tickData, fundData, compData] = await Promise.all([
      fetchJSON(`https://psxterminal.com/api/ticks/REG/${ticker}`),
      fetchJSON(`https://psxterminal.com/api/fundamentals/${ticker}`),
      fetchJSON(`https://psxterminal.com/api/companies/${ticker}`)
    ]);

    if (!tickData) return null;

    const price  = tickData.currentPrice || tickData.ldcp || tickData.last;
    const prev   = tickData.ldcp || tickData.previousClose;
    const change = price && prev ? ((price - prev) / prev * 100) : (tickData.change || 0);

    if (!price) return null;

    const fmt = (v, d=2) => v != null ? Number(v).toFixed(d) : 'N/A';
    const pct = (v) => v != null ? Number(v).toFixed(1) + '%' : 'N/A';

    // Company info
    const name   = compData?.name || compData?.companyName || ticker;
    const sector = compData?.sector || compData?.industry || 'Pakistan Stock Exchange';

    // Fundamentals
    const f = fundData || {};
    const marketCap = tickData.marketCap || f.marketCap;

    return {
      ticker,
      name,
      sector,
      industry: compData?.industry || sector,

      // Price
      price:     fmt(price),
      change:    fmt(change),
      changeAmt: prev ? fmt(price - prev) : 'N/A',
      high:      fmt(tickData.high),
      low:       fmt(tickData.low),
      prevClose: fmt(prev),
      volume:    tickData.volume ? Number(tickData.volume).toLocaleString() : 'N/A',
      week52High:fmt(tickData.yearHigh || f.yearHigh),
      week52Low: fmt(tickData.yearLow  || f.yearLow),
      marketCap: marketCap ? 'Rs. ' + (marketCap / 1e9).toFixed(1) + 'B' : 'N/A',
      dir:       change >= 0 ? 'up' : 'dn',

      // Valuation
      pe:        fmt(f.pe || f.peRatio),
      pb:        fmt(f.pb || f.priceToBook),
      eps:       fmt(f.eps),
      divYield:  f.dividendYield ? pct(f.dividendYield) : 'N/A',

      // Profitability
      roe:         f.roe      ? pct(f.roe)      : 'N/A',
      roa:         f.roa      ? pct(f.roa)      : 'N/A',
      grossMargin: f.grossMargin ? pct(f.grossMargin) : 'N/A',
      netMargin:   f.netMargin   ? pct(f.netMargin)   : 'N/A',

      // Health
      currentRatio:  fmt(f.currentRatio),
      debtToEquity:  fmt(f.debtToEquity || f.leverageRatio),
      revenue:       f.revenue ? 'Rs. ' + (f.revenue / 1e9).toFixed(1) + 'B' : 'N/A',
    };
  } catch(e) {
    console.error('PSX Terminal error:', e.message);
    return null;
  }
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
52W: PKR ${stockData.week52Low} – ${stockData.week52High} | Market Cap: ${stockData.marketCap}
Volume: ${stockData.volume} | Prev Close: PKR ${stockData.prevClose}

VALUATION: P/E ${stockData.pe}x | P/B ${stockData.pb}x | EPS PKR ${stockData.eps} | Div Yield ${stockData.divYield}
PROFITABILITY: ROE ${stockData.roe} | ROA ${stockData.roa} | Gross Margin ${stockData.grossMargin} | Net Margin ${stockData.netMargin}
HEALTH: Current Ratio ${stockData.currentRatio} | D/E ${stockData.debtToEquity} | Revenue ${stockData.revenue}

PAKISTAN MACRO: ${macroContext}

Return ONLY valid JSON (no markdown):
{
  "verdict": "Positive",
  "score": 7,
  "headline": "Positive: one sharp reason max 10 words",
  "body": "2-3 sentences. Clear verdict. 2 strongest drivers. One risk. Plain English. No buy/sell advice.",
  "insights": [
    {"icon":"📊","value":"metric","label":"plain explanation max 10 words","color":"green"},
    {"icon":"💰","value":"metric","label":"plain explanation max 10 words","color":"green"},
    {"icon":"⚠️","value":"risk","label":"plain explanation max 10 words","color":"amber"}
  ],
  "signals": [{"label":"2-3 words","type":"green"},{"label":"2-3 words","type":"amber"}],
  "scores": {"Financial health":7,"Macro environment":5,"Growth outlook":6,"Risk level":6},
  "factors": [
    {"icon":"🌍","title":"Factor 1","detail":"2 sentences plain English."},
    {"icon":"💸","title":"Factor 2","detail":"2 sentences plain English."},
    {"icon":"💱","title":"Factor 3","detail":"2 sentences plain English."}
  ],
  "summary": "One sentence overall summary."
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: 'You are a senior PSX equity analyst. Return only valid JSON. Be specific and data-driven.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const verdict = JSON.parse(jsonMatch[0]);
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
  if (!ticker || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  console.log(`Fetching: ${cleanTicker}`);

  const stockData = await getStockData(cleanTicker);

  if (!stockData) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: `No data found for ${cleanTicker}. The market may be closed or this ticker may not exist on PSX.`
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
