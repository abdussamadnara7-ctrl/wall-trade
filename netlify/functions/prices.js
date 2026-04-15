const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, extraHeaders = {}, ms = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { resolve(null); }, ms);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)',
        ...extraHeaders  // extraHeaders can override User-Agent if needed
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
    https.get; // suppress lint
  }).catch(() => null);
}

// Proper fetchJSON without the duplicate https.get
function get(url, extraHeaders = {}, ms = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)',
        ...extraHeaders
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`${url.slice(0, 75)} → ${res.statusCode} len=${body.length}`);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', e => { clearTimeout(timer); console.log('ERR:', e.message); resolve(null); });
  });
}

const PSX_HEADERS = {
  'Origin':  'https://psxterminal.com',
  'Referer': 'https://psxterminal.com/',
  'Accept':  'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9'
};

// ── PSX STOCK PRICES — PSX Terminal ───────────────────────────
// Fetch in batches of 5 to avoid rate limiting
async function getPSXPrices(tickers) {
  const results = {};
  const BATCH = 5;

  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    const fetches = batch.map(ticker =>
      get(`https://psxterminal.com/api/ticks/REG/${ticker}`, PSX_HEADERS, 5000)
        .then(data => ({ ticker, data }))
    );
    const responses = await Promise.allSettled(fetches);

    responses.forEach(r => {
      if (r.status !== 'fulfilled') return;
      const { ticker, data } = r.value;
      if (!data) return;

      const d = data?.data ?? data;
      const price = d?.price ?? d?.last ?? d?.close;
      if (!price || isNaN(parseFloat(price))) return;

      const open = parseFloat(d.open ?? price);
      let change;
      if (d.changePercent != null) {
        const raw = parseFloat(d.changePercent);
        change = Math.abs(raw) < 1.0 ? raw * 100 : raw;
      } else {
        change = open ? ((parseFloat(price) - open) / open * 100) : 0;
      }

      results[ticker] = {
        price:     parseFloat(price).toFixed(2),
        change:    change.toFixed(2),
        changeAmt: (parseFloat(price) - open).toFixed(2),
        high:      d.high  ? parseFloat(d.high).toFixed(2)  : null,
        low:       d.low   ? parseFloat(d.low).toFixed(2)   : null,
        volume:    d.volume ? String(d.volume) : null,
        dir:       change >= 0 ? 'up' : 'dn',
        currency:  'PKR'
      };
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH < tickers.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`PSX prices: ${Object.keys(results).length}/${tickers.length} loaded — ${Object.keys(results).join(',')}`);
  return results;
}

// ── KSE-100 INDEX — PSX Terminal ──────────────────────────────
async function getKSE100() {
  try {
    const data = await get('https://psxterminal.com/api/ticks/IDX/KSE100', PSX_HEADERS, 5000);
    const d = data?.data ?? data;
    const price = d?.price ?? d?.last ?? d?.close;
    if (!price || Number(price) < 10000) return null;

    let change;
    if (d.changePercent != null) {
      const raw = parseFloat(d.changePercent);
      change = Math.abs(raw) < 1.0 ? raw * 100 : raw;
    } else {
      const open = parseFloat(d.open ?? price);
      change = open ? ((parseFloat(price) - open) / open * 100) : 0;
    }

    return {
      price:  Math.round(parseFloat(price)).toLocaleString(),
      raw:    Math.round(parseFloat(price)),
      change: change.toFixed(2),
      dir:    change >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── COMMODITIES: BRENT + GOLD — FMP batch-commodity-quotes ───
async function getCommodities(key) {
  if (!key) return {};
  const results = {};
  try {
    const data = await get(
      `https://financialmodelingprep.com/stable/batch-commodity-quotes?apikey=${key}`
    );
    if (!Array.isArray(data)) return results;
    data.forEach(q => {
      if (!q?.symbol || q?.price == null) return;
      const change = parseFloat(q.changesPercentage ?? q.change ?? 0);
      // Brent crude
      if (q.symbol === 'BZUSD' || q.symbol === 'BRENTOIL' || q.symbol === 'BRENTOIL-FUT') {
        results.brent = { price: parseFloat(q.price).toFixed(2), change: change.toFixed(2), dir: change >= 0 ? 'up' : 'dn' };
      }
      // Gold
      if (q.symbol === 'GCUSD' || q.symbol === 'GOLD' || q.symbol === 'XAUUSD') {
        results.gold = { price: Math.round(q.price).toString(), change: change.toFixed(2), dir: change >= 0 ? 'up' : 'dn' };
      }
    });
    console.log('Commodities:', JSON.stringify(results));
  } catch(e) { console.log('Commodities error:', e.message); }
  return results;
}

// ── PKR/USD — FMP ─────────────────────────────────────────────
async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await get(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price) return { rate: parseFloat(q.price).toFixed(2) };
  } catch(e) {}
  return null;
}

// ── S&P 500 — FMP ─────────────────────────────────────────────
async function getSP500(key) {
  if (!key) return null;
  try {
    const data = await get(`https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (!q?.price) return null;
    return {
      price:  parseFloat(q.price).toFixed(2),
      change: parseFloat(q.changesPercentage ?? 0).toFixed(2)
    };
  } catch(e) { return null; }
}

// ── CRYPTO — FMP batch-crypto-quotes ─────────────────────────
async function getCrypto(key) {
  if (!key) return [];
  const WANT = ['BTCUSD','ETHUSD','SOLUSD','XRPUSD','BNBUSD'];
  try {
    const data = await get(
      `https://financialmodelingprep.com/stable/batch-crypto-quotes?apikey=${key}`
    );
    if (!Array.isArray(data)) return [];
    const results = data
      .filter(q => q?.symbol && WANT.includes(q.symbol) && q?.price != null)
      .map(q => {
        const change = parseFloat(q.changesPercentage ?? q.change ?? 0);
        return {
          symbol:    q.symbol.replace('USD', ''),
          price:     parseFloat(q.price).toFixed(2),
          change:    change.toFixed(2),
          change24h: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
          dir:       change >= 0 ? 'up' : 'dn'
        };
      });
    console.log(`Crypto: ${results.map(c=>c.symbol).join(',')}`);
    return results;
  } catch(e) { console.log('Crypto error:', e.message); return []; }
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

  // PSX Terminal calls run first (sequential batches), FMP calls run in parallel
  const [psxPrices, kse100] = await Promise.all([
    getPSXPrices(requestedTickers),
    getKSE100()
  ]);

  // FMP calls in parallel after PSX
  const [commodities, pkrusd, sp500, crypto] = await Promise.all([
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
