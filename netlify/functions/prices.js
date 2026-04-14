const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 6000);
    https.get(url, {
      headers: { 'User-Agent': 'WallTrade/1.0', ...headers }
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

// ── PSX PRICES VIA PSX TERMINAL ───────────────────────────────
async function getPSXPrices(tickers) {
  const results = {};
  const fetches = tickers.map(ticker =>
    fetchJSON(
      `https://psxterminal.com/api/ticks/stock/${ticker}`,
      { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' }
    ).then(data => ({ ticker, data }))
  );
  const responses = await Promise.allSettled(fetches);
  responses.forEach(r => {
    if (r.status !== 'fulfilled') return;
    const { ticker, data } = r.value;
    if (!data) return;
    const d = data?.data ?? data;
    const price = d?.price ?? d?.last ?? d?.close;
    if (!price) return;
    const open   = d.open ?? price;
    const change = open ? ((price - open) / open * 100) : 0;
    results[ticker] = {
      price:     parseFloat(price).toFixed(2),
      change:    change.toFixed(2),
      changeAmt: (price - open).toFixed(2),
      high:      d.high ? parseFloat(d.high).toFixed(2) : null,
      low:       d.low  ? parseFloat(d.low).toFixed(2)  : null,
      volume:    d.volume ?? null,
      dir:       change >= 0 ? 'up' : 'dn',
      currency:  'PKR'
    };
  });
  return results;
}

// ── KSE-100 INDEX (PSX Terminal) ──────────────────────────────
async function getKSE100() {
  try {
    const data = await fetchJSON(
      'https://psxterminal.com/api/ticks/IDX/KSE100',
      { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' }
    );
    const d = data?.data ?? data;
    if (!d?.price && !d?.last && !d?.close) return null;
    const price  = parseFloat(d.price ?? d.last ?? d.close);
    const open   = parseFloat(d.open ?? price);
    const change = open ? ((price - open) / open * 100) : 0;
    return {
      price:  Math.round(price).toLocaleString(),
      raw:    Math.round(price),
      change: change.toFixed(2),
      dir:    change >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── COMMODITIES VIA FMP (Brent + Gold) ───────────────────────
// Uses FMP which works from Netlify — Yahoo Finance blocks server IPs
async function getCommodities(key) {
  const results = {};
  if (!key) return results;
  try {
    // Batch: BZUSD = Brent crude, GCUSD = Gold spot
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=BZUSD,GCUSD&apikey=${key}`
    );
    if (Array.isArray(data)) {
      data.forEach(q => {
        if (!q?.price) return;
        if (q.symbol === 'BZUSD') {
          results.brent = {
            price:  parseFloat(q.price).toFixed(2),
            change: parseFloat(q.changesPercentage ?? 0).toFixed(2),
            dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
          };
        }
        if (q.symbol === 'GCUSD') {
          results.gold = {
            price:  Math.round(q.price).toString(),
            change: parseFloat(q.changesPercentage ?? 0).toFixed(2),
            dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
          };
        }
      });
    }
  } catch(e) {}
  return results;
}

// ── PKR/USD VIA FMP ───────────────────────────────────────────
async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`
    );
    const rate = Array.isArray(data) ? data[0]?.price : null;
    if (rate) return { rate: parseFloat(rate).toFixed(2) };
  } catch(e) {}
  return null;
}

// ── CRYPTO PRICES VIA FMP ─────────────────────────────────────
async function getCrypto(key) {
  if (!key) return [];
  try {
    const symbols = 'BTCUSD,ETHUSD,SOLUSD,XRPUSD,BNBUSD';
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${key}`
    );
    if (!Array.isArray(data)) return [];
    return data.map(q => ({
      symbol:  q.symbol?.replace('USD',''),
      price:   parseFloat(q.price).toFixed(2),
      change:  parseFloat(q.changesPercentage ?? 0).toFixed(2),
      change24h: (parseFloat(q.changesPercentage ?? 0) >= 0 ? '+' : '') + parseFloat(q.changesPercentage ?? 0).toFixed(2) + '%',
      dir:     (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
    })).filter(c => c.symbol);
  } catch(e) { return []; }
}

// ── S&P 500 VIA FMP ───────────────────────────────────────────
async function getSP500(key) {
  if (!key) return null;
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${key}`
    );
    if (Array.isArray(data) && data[0]?.price) {
      return {
        price:  parseFloat(data[0].price).toFixed(2),
        change: parseFloat(data[0].changesPercentage ?? 0).toFixed(2)
      };
    }
  } catch(e) {}
  return null;
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

  // Only allow the 19 supported PSX stocks
  const ALLOWED = [
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    'HBL','MCB','UBL','NBP','ABL','BAFL',
    'ENGROH','FFC','EFERT',
    'LUCK','MLCF','CHCC','DGKC'
  ];

  const requestedTickers = (payload.tickers || ALLOWED).filter(t => ALLOWED.includes(t));

  // Fetch everything in parallel
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
