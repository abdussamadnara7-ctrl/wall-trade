const https = require('https');

function fetchJSON(url, timeoutMs = 6000) {
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

// ── PSX TERMINAL API (free, no key needed) ─────────────────────
async function getPSXPrice(ticker) {
  try {
    const data = await fetchJSON(`https://psxterminal.com/api/ticks/REG/${ticker}`);
    if (!data) return null;

    // PSX Terminal response format
    const price  = data.currentPrice || data.ldcp || data.close || data.last;
    const prev   = data.ldcp || data.previousClose || data.open;
    const change = price && prev ? ((price - prev) / prev * 100) : (data.change || 0);

    if (!price) return null;

    return {
      price:  Number(price).toFixed(2),
      change: Number(change).toFixed(2),
      high:   data.high ? Number(data.high).toFixed(2) : null,
      low:    data.low  ? Number(data.low).toFixed(2)  : null,
      volume: data.volume || data.totalVolume || null,
      dir:    change >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── KSE-100 INDEX (Yahoo Finance — already working) ────────────
async function getKSE100() {
  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (!data?.chart?.result?.[0]) return null;
    const closes = data.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 2) return null;
    const current = closes[closes.length - 1];
    const prev    = closes[closes.length - 2];
    const change  = ((current - prev) / prev * 100);
    return {
      price:  Math.round(current).toLocaleString(),
      change: change.toFixed(2),
      dir:    change >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── COMMODITIES (Yahoo Finance — already working) ──────────────
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

// ── PKR/USD ────────────────────────────────────────────────────
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

  const ALLOWED = [
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    'HBL','MCB','UBL','NBP','ABL','BAFL','BAHL','MEBL','FABL',
    'ENGRO','FFBL','FFC','EFERT',
    'LUCK','MLCF','CHCC','DGKC','PIOC','FCCL',
    'TRG','SYS','NETSOL','PAKT','PNSC','SNGP','SSGC'
  ];

  const tickers = (payload.tickers || ALLOWED).filter(t => ALLOWED.includes(t));

  // Fetch all PSX prices in parallel + macro data
  const [priceResults, kse100, commodities, pkrusd] = await Promise.all([
    Promise.all(tickers.map(async ticker => {
      const data = await getPSXPrice(ticker);
      return { ticker, data };
    })),
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
    body: JSON.stringify({
      prices,
      kse100,
      commodities,
      pkrusd,
      timestamp: new Date().toISOString(),
      source: 'psxterminal.com'
    })
  };
};
