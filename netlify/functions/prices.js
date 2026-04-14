const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, extraHeaders = {}, ms = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { resolve(null); }, ms);
    const req = https.get(url, {
      headers: {
        'User-Agent':  'Mozilla/5.0 (compatible; WallTrade/1.0)',
        'Accept':      'application/json',
        ...extraHeaders
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`${url.slice(0, 70)} → ${res.statusCode} len=${body.length}`);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', e => { clearTimeout(timer); console.log('ERR:', e.message); resolve(null); });
  });
}

// ── PSX STOCK PRICES — PSX Terminal ───────────────────────────
// Confirmed working from Netlify with these exact headers
async function getPSXPrices(tickers) {
  const results = {};
  const PSX_HEADERS = {
    'Origin':  'https://psxterminal.com',
    'Referer': 'https://psxterminal.com/',
    'Accept':  'application/json, text/plain, */*'
  };

  const fetches = tickers.map(ticker =>
    fetchJSON(
      `https://psxterminal.com/api/ticks/stock/${ticker}`,
      PSX_HEADERS, 5000
    ).then(data => ({ ticker, data }))
  );

  const responses = await Promise.allSettled(fetches);

  responses.forEach(r => {
    if (r.status !== 'fulfilled') return;
    const { ticker, data } = r.value;
    if (!data) return;

    const d = data?.data ?? data;
    const price = d?.price ?? d?.last ?? d?.close;
    if (!price || isNaN(parseFloat(price))) return;

    const open = d.open ?? price;
    // PSX Terminal changePercent may be decimal (0.012) or percent (1.2)
    let change;
    if (d.changePercent != null) {
      const raw = parseFloat(d.changePercent);
      change = Math.abs(raw) < 1.0 ? raw * 100 : raw;
    } else {
      change = open ? ((price - open) / open * 100) : 0;
    }

    results[ticker] = {
      price:     parseFloat(price).toFixed(2),
      change:    change.toFixed(2),
      changeAmt: (parseFloat(price) - parseFloat(open)).toFixed(2),
      high:      d.high  ? parseFloat(d.high).toFixed(2)  : null,
      low:       d.low   ? parseFloat(d.low).toFixed(2)   : null,
      volume:    d.volume ?? null,
      dir:       change >= 0 ? 'up' : 'dn',
      currency:  'PKR'
    };
  });

  console.log(`PSX prices: ${Object.keys(results).length}/${tickers.length} loaded`);
  return results;
}

// ── KSE-100 INDEX — PSX Terminal ──────────────────────────────
async function getKSE100() {
  try {
    const data = await fetchJSON(
      'https://psxterminal.com/api/ticks/IDX/KSE100',
      { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/', 'Accept': 'application/json, text/plain, */*' },
      5000
    );
    const d = data?.data ?? data;
    const price = d?.price ?? d?.last ?? d?.close;
    if (!price || Number(price) < 10000) return null;

    let change;
    if (d.changePercent != null) {
      const raw = parseFloat(d.changePercent);
      change = Math.abs(raw) < 1.0 ? raw * 100 : raw;
    } else {
      const open = d.open ?? price;
      change = open ? ((price - open) / open * 100) : 0;
    }

    return {
      price:  Math.round(parseFloat(price)).toLocaleString(),
      raw:    Math.round(parseFloat(price)),
      change: change.toFixed(2),
      dir:    change >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── COMMODITIES: BRENT + GOLD — FMP ───────────────────────────
async function getCommodities(key) {
  if (!key) return {};
  const results = {};
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=BZUSD,GCUSD&apikey=${key}`
    );
    if (!Array.isArray(data)) return results;
    data.forEach(q => {
      if (!q?.price) return;
      const change = parseFloat(q.changesPercentage ?? 0);
      if (q.symbol === 'BZUSD') {
        results.brent = { price: parseFloat(q.price).toFixed(2), change: change.toFixed(2), dir: change >= 0 ? 'up' : 'dn' };
      }
      if (q.symbol === 'GCUSD') {
        results.gold = { price: Math.round(q.price).toString(), change: change.toFixed(2), dir: change >= 0 ? 'up' : 'dn' };
      }
    });
  } catch(e) {}
  return results;
}

// ── PKR/USD — FMP ─────────────────────────────────────────────
async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`
    );
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price) return { rate: parseFloat(q.price).toFixed(2) };
  } catch(e) {}
  return null;
}

// ── S&P 500 — FMP ─────────────────────────────────────────────
async function getSP500(key) {
  if (!key) return null;
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${key}`
    );
    const q = Array.isArray(data) ? data[0] : null;
    if (!q?.price) return null;
    return {
      price:  parseFloat(q.price).toFixed(2),
      change: parseFloat(q.changesPercentage ?? 0).toFixed(2)
    };
  } catch(e) { return null; }
}

// ── CRYPTO — FMP ──────────────────────────────────────────────
async function getCrypto(key) {
  if (!key) return [];
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=BTCUSD,ETHUSD,SOLUSD,XRPUSD,BNBUSD&apikey=${key}`
    );
    if (!Array.isArray(data)) return [];
    return data.filter(q => q?.price).map(q => {
      const change = parseFloat(q.changesPercentage ?? 0);
      return {
        symbol:    q.symbol.replace('USD', ''),
        price:     parseFloat(q.price).toFixed(2),
        change:    change.toFixed(2),
        change24h: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
        dir:       change >= 0 ? 'up' : 'dn'
      };
    });
  } catch(e) { return []; }
}

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) {}

  const key = process.env.FMP_API_KEY;

  const ALLOWED = [
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    'HBL','MCB','UBL','NBP','ABL','BAFL',
    'ENGROH','FFC','EFERT',
    'LUCK','MLCF','CHCC','DGKC'
  ];

  const requestedTickers = (payload.tickers || ALLOWED).filter(t => ALLOWED.includes(t));

  const [psxPrices, kse100, commodities, pkrusd, sp500, crypto] = await Promise.all([
    getPSXPrices(requestedTickers),
    getKSE100(),
    getCommodities(key),
    getPKRUSD(key),
    getSP500(key),
    getCrypto(key)
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      prices:      psxPrices,
      kse100:      kse100,
      commodities: commodities,
      pkrusd:      pkrusd,
      sp500:       sp500,
      crypto:      crypto,
      timestamp:   new Date().toISOString()
    })
  };
};
