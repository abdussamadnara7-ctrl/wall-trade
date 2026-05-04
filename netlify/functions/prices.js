const https = require('https');
const http = require('http');

const PROXY = 'http://188.166.245.128:3000';

function getJson(url, ms = 8000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => { console.log('TIMEOUT:', url); resolve(null); }, ms);
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); }
        catch(e) { console.log('JSON parse error for', url); resolve(null); }
      });
    }).on('error', e => { clearTimeout(timer); console.log('ERR:', e.message); resolve(null); });
  });
}

// ── PSX LIVE PRICE via timeseries/int endpoint ────────────────
async function getPSXPrice(ticker) {
  try {
    const data = await getJson(`${PROXY}/timeseries/int/${ticker}`, 8000);
    if (!data?.data?.length) return null;
    // data.data is array of [timestamp, price, volume] sorted newest first
    const latest = data.data[0];
    const price = parseFloat(latest[1]);
    if (!price || price <= 0) return null;
    // Calculate change from oldest price today
    const oldest = data.data[data.data.length - 1];
    const openPrice = parseFloat(oldest[1]);
    const changeAmt = price - openPrice;
    const changePct = openPrice > 0 ? (changeAmt / openPrice) * 100 : 0;
    return {
      price:     price.toFixed(2),
      change:    changePct.toFixed(2),
      changeAmt: changeAmt.toFixed(2),
      volume:    latest[2]?.toString() || '0',
      dir:       changePct >= 0 ? 'up' : 'dn',
      currency:  'PKR'
    };
  } catch(e) {
    console.log(`PSX error for ${ticker}:`, e.message);
    return null;
  }
}

async function getPSXPrices(tickers) {
  const results = {};
  // Fetch all tickers in parallel
  const fetches = await Promise.all(
    tickers.map(ticker =>
      getPSXPrice(ticker).then(data => ({ ticker, data }))
    )
  );
  fetches.forEach(({ ticker, data }) => {
    if (data) results[ticker] = data;
  });
  console.log(`PSX prices: ${Object.keys(results).length}/${tickers.length} — ${Object.keys(results).join(',')}`);
  return results;
}

// ── KSE-100 INDEX ─────────────────────────────────────────────
async function getKSE100() {
  try {
    const data = await getJson(`${PROXY}/timeseries/int/KSE100`, 8000);
    if (!data?.data?.length) return null;
    const latest = data.data[0];
    const price = parseFloat(latest[1]);
    const oldest = data.data[data.data.length - 1];
    const openPrice = parseFloat(oldest[1]);
    const changePct = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0;
    return {
      price:  Math.round(price).toLocaleString(),
      raw:    Math.round(price),
      change: changePct.toFixed(2),
      dir:    changePct >= 0 ? 'up' : 'dn'
    };
  } catch(e) {
    console.log('KSE100 error:', e.message);
    return null;
  }
}

// ── FMP HELPERS ───────────────────────────────────────────────
async function getCommodities(key) {
  if (!key) return {};
  const results = {};
  const BRENT_SYMBOLS = ['BZUSD', 'OUSX', 'CLUSD', 'WTIUSD'];
  const GOLD_SYMBOLS  = ['GCUSD', 'XAUUSD', 'GOLDUSD'];
  const allSymbols = [...BRENT_SYMBOLS, ...GOLD_SYMBOLS];
  const fetches = await Promise.all(
    allSymbols.map(sym =>
      getJson(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, 6000)
        .then(d => ({ sym, q: Array.isArray(d) ? d[0] : null }))
    )
  );
  for (const sym of BRENT_SYMBOLS) {
    const q = fetches.find(f => f.sym === sym)?.q;
    if (q?.price && parseFloat(q.price) > 30 && parseFloat(q.price) < 200) {
      const chg = parseFloat(q.changesPercentage ?? 0);
      results.brent = { price: parseFloat(q.price).toFixed(2), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      break;
    }
  }
  for (const sym of GOLD_SYMBOLS) {
    const q = fetches.find(f => f.sym === sym)?.q;
    if (q?.price && parseFloat(q.price) > 1000 && parseFloat(q.price) < 5000) {
      const chg = parseFloat(q.changesPercentage ?? 0);
      results.gold = { price: Math.round(parseFloat(q.price)).toString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      break;
    }
  }
  return results;
}

async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await getJson(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price) return { rate: parseFloat(q.price).toFixed(2) };
  } catch(e) {}
  return null;
}

async function getSP500(key) {
  if (!key) return null;
  try {
    const data = await getJson(`https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (!q?.price) return null;
    return { price: parseFloat(q.price).toFixed(2), change: parseFloat(q.changesPercentage ?? 0).toFixed(2) };
  } catch(e) { return null; }
}

async function getCrypto(key) {
  if (!key) return [];
  const WANT = ['BTCUSD','ETHUSD','SOLUSD','XRPUSD','BNBUSD','ADAUSD','AVAXUSD','DOTUSD','MATICUSD','LINKUSD'];
  const individual = await Promise.all(
    WANT.map(sym =>
      getJson(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, 6000)
        .then(d => ({ sym, q: Array.isArray(d) ? d[0] : null }))
    )
  );
  const results = [];
  individual.forEach(({ sym, q }) => {
    if (q?.price != null && parseFloat(q.price) > 0) {
      const change = parseFloat(q.changesPercentage ?? 0);
      results.push({
        symbol:   sym.replace('USD', ''),
        price:    parseFloat(q.price).toFixed(2),
        change:   change.toFixed(2),
        change24h: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
        dir:      change >= 0 ? 'up' : 'dn'
      });
    }
  });
  return results;
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

  // Fetch PSX prices and KSE100 and all other data in parallel
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
