const https = require('https');

function fetchJSON(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
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

// ── PSX TERMINAL — single stock ───────────────────────────────
async function getPSXTick(ticker) {
  try {
    const resp = await fetchJSON(`https://psxterminal.com/api/ticks/REG/${ticker}`);
    if (!resp) return null;

    // Structure: {success:true, data:{market,st,symbol,price,ldcp,high,low,volume,change,changePercent}, timestamp}
    const d = resp.data ?? resp;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;

    const price  = d.price ?? d.currentPrice ?? d.close;
    const ldcp   = d.ldcp  ?? d.previousClose ?? d.prevClose;
    const high   = d.high;
    const low    = d.low;
    const volume = d.volume ?? d.totalVolume;

    if (price == null) return null;

    const pNum   = Number(price);
    const ldcpN  = ldcp != null ? Number(ldcp) : null;
    const change = d.change != null ? Number(d.change) : (ldcpN ? pNum - ldcpN : 0);
    const pct    = d.changePercent != null ? Number(d.changePercent)
                 : (ldcpN && ldcpN !== 0 ? (change / ldcpN * 100) : 0);

    return {
      price:  pNum.toFixed(2),
      change: pct.toFixed(2),
      high:   high   ? Number(high).toFixed(2)   : null,
      low:    low    ? Number(low).toFixed(2)     : null,
      volume: volume ? Number(volume).toLocaleString() : null,
      ldcp:   ldcpN  ? ldcpN.toFixed(2)           : null,
      status: d.st   ?? 'OPEN',
      dir:    pct >= 0 ? 'up' : 'dn'
    };
  } catch(e) {
    return null;
  }
}

// ── KSE-100 via Yahoo Finance ─────────────────────────────────
async function getKSE100() {
  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (!data?.chart?.result?.[0]) return null;
    const closes = data.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 2) return null;
    const cur  = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const chg  = ((cur - prev) / prev * 100);
    return { price: Math.round(cur).toLocaleString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
  } catch(e) { return null; }
}

// ── COMMODITIES ───────────────────────────────────────────────
async function getCommodities() {
  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v7/finance/quote?symbols=BZ%3DF,GC%3DF&fields=symbol,regularMarketPrice,regularMarketChangePercent');
    const quotes = data?.quoteResponse?.result || [];
    const result = {};
    quotes.forEach(q => {
      if (q.symbol === 'BZ=F') result.brent = { price: q.regularMarketPrice?.toFixed(2), change: q.regularMarketChangePercent?.toFixed(2) };
      if (q.symbol === 'GC=F') result.gold  = { price: Math.round(q.regularMarketPrice)?.toString(), change: q.regularMarketChangePercent?.toFixed(2) };
    });
    return result;
  } catch(e) { return {}; }
}

// ── PKR/USD ───────────────────────────────────────────────────
async function getPKRUSD() {
  try {
    const data = await fetchJSON('https://open.er-api.com/v6/latest/USD');
    if (data?.rates?.PKR) return { rate: data.rates.PKR.toFixed(2) };
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
    'Cache-Control': 'public, max-age=30'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) {}

  const ALL_TICKERS = [
    // Energy & Oil (6)
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    // Banking (6)
    'HBL','MCB','UBL','NBP','ABL','BAFL',
    // Fertiliser (4)
    'ENGRO','FFBL','FFC','EFERT',
    // Cement (4)
    'LUCK','MLCF','CHCC','DGKC'
  ];

  const tickers = (payload.tickers || ALL_TICKERS).filter(t => ALL_TICKERS.includes(t));

  // Fetch all in parallel
  const [priceResults, kse100, commodities, pkrusd] = await Promise.all([
    Promise.all(tickers.map(async ticker => ({ ticker, data: await getPSXTick(ticker) }))),
    getKSE100(),
    getCommodities(),
    getPKRUSD()
  ]);

  const prices = {};
  priceResults.forEach(({ ticker, data }) => {
    if (data) prices[ticker] = data;
  });

  console.log(`Prices fetched: ${Object.keys(prices).length}/${tickers.length} tickers`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ prices, kse100, commodities, pkrusd, timestamp: new Date().toISOString() })
  };
};
