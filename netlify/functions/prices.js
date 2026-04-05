const https = require('https');

// ── FETCH HELPERS ─────────────────────────────────────────────
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

// FMP uses same fetch but different headers + key appended to URL
function fetchFMP(endpoint, timeoutMs = 8000) {
  const key = process.env.FMP_API_KEY;
  if (!key) return Promise.resolve(null);
  const url = `https://financialmodelingprep.com/stable/${endpoint}&apikey=${key}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    https.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
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
    const d = resp.data ?? resp;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    const price = d.price ?? d.currentPrice ?? d.close;
    const ldcp  = d.ldcp  ?? d.previousClose ?? d.prevClose;
    if (price == null) return null;
    const pNum  = Number(price);
    const ldcpN = ldcp != null ? Number(ldcp) : null;
    const change = d.change != null ? Number(d.change) : (ldcpN ? pNum - ldcpN : 0);
    const pct   = d.changePercent != null ? Number(d.changePercent)
                : (ldcpN && ldcpN !== 0 ? (change / ldcpN * 100) : 0);
    return {
      price:  pNum.toFixed(2),
      change: pct.toFixed(2),
      high:   d.high   ? Number(d.high).toFixed(2)   : null,
      low:    d.low    ? Number(d.low).toFixed(2)     : null,
      volume: d.volume ? Number(d.volume).toLocaleString() : null,
      ldcp:   ldcpN    ? ldcpN.toFixed(2)             : null,
      dir:    pct >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── CRYPTO via FMP (confirmed Starter endpoint) ───────────────
// Uses: /stable/batch-crypto-quotes (returns all cryptos at once)
// Fields: symbol, price, changesPercentage, volume, marketCap
async function getCrypto() {
  try {
    const TOP = ['BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','ADAUSD','AVAXUSD','DOTUSD','MATICUSD','LINKUSD'];
    
    // batch-crypto-quotes returns ALL crypto — we filter to top 10
    const data = await fetchFMP('batch-crypto-quotes?');
    if (!data || !Array.isArray(data)) {
      console.log('Crypto batch failed, trying individual quotes');
      // Fallback: individual quote-short calls for each
      const results = await Promise.all(
        TOP.map(sym => fetchFMP(`quote-short?symbol=${sym}`))
      );
      return results
        .map((r, i) => {
          const q = Array.isArray(r) ? r[0] : r;
          if (!q?.price) return null;
          const sym = TOP[i].replace('USD','');
          return {
            symbol: sym,
            price:  Number(q.price).toFixed(2),
            change: Number(q.changesPercentage ?? 0).toFixed(2),
            dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
          };
        })
        .filter(Boolean);
    }

    // Filter to our top 10 symbols
    return data
      .filter(q => TOP.includes(q.symbol))
      .sort((a, b) => TOP.indexOf(a.symbol) - TOP.indexOf(b.symbol))
      .map(q => ({
        symbol: q.symbol.replace('USD',''),
        price:  Number(q.price).toFixed(2),
        change: Number(q.changesPercentage ?? 0).toFixed(2),
        marketCap: q.marketCap,
        volume: q.volume,
        dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
      }));
  } catch(e) {
    console.error('Crypto error:', e.message);
    return [];
  }
}

// ── FOREX via FMP (confirmed Starter endpoint) ────────────────
// Uses: /stable/batch-forex-quotes (returns all FX pairs at once)
// Fields: symbol, bid, ask, open, previousClose, changes, changesPercentage
async function getFX() {
  try {
    const PAIRS = ['USDPKR','EURUSD','GBPUSD','USDJPY','USDSAR','USDAED','GBPPKR','EURUSD'];

    // batch-forex-quotes returns all pairs — filter what we need
    const data = await fetchFMP('batch-forex-quotes?');
    if (!data || !Array.isArray(data)) {
      console.log('FX batch failed, trying individual quotes');
      // Fallback: individual quote calls
      const results = await Promise.all(
        PAIRS.map(pair => fetchFMP(`quote?symbol=${pair}`))
      );
      const fx = {};
      results.forEach((r, i) => {
        const q = Array.isArray(r) ? r[0] : r;
        if (!q?.price) return;
        fx[PAIRS[i]] = {
          rate:   Number(q.price).toFixed(4),
          change: Number(q.changesPercentage ?? 0).toFixed(2),
          dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
        };
      });
      return fx;
    }

    const fx = {};
    data
      .filter(q => PAIRS.includes(q.symbol))
      .forEach(q => {
        const rate = q.ask ?? q.bid ?? q.price;
        if (!rate) return;
        fx[q.symbol] = {
          rate:   Number(rate).toFixed(4),
          change: Number(q.changesPercentage ?? q.changes ?? 0).toFixed(2),
          dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
        };
      });
    return fx;
  } catch(e) {
    console.error('FX error:', e.message);
    return {};
  }
}

// ── S&P 500 via FMP ───────────────────────────────────────────
// Uses: /stable/quote?symbol=SPY (SPY ETF tracks S&P 500)
async function getSP500() {
  try {
    const data = await fetchFMP('quote?symbol=SPY');
    const q = Array.isArray(data) ? data[0] : data;
    if (!q?.price) return null;
    return {
      price:  Number(q.price).toFixed(2),
      change: Number(q.changesPercentage ?? 0).toFixed(2),
      dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── KSE-100 via Yahoo Finance ─────────────────────────────────
async function getKSE100() {
  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (!data?.chart?.result?.[0]) return null;
    const closes = data.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 2) return null;
    const cur = closes[closes.length - 1], prev = closes[closes.length - 2];
    const chg = ((cur - prev) / prev * 100);
    return { price: Math.round(cur).toLocaleString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
  } catch(e) { return null; }
}

// ── COMMODITIES via Yahoo Finance ─────────────────────────────
async function getCommodities() {
  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v7/finance/quote?symbols=BZ%3DF,GC%3DF&fields=symbol,regularMarketPrice,regularMarketChangePercent');
    const quotes = data?.quoteResponse?.result || [];
    const result = {};
    quotes.forEach(q => {
      if (q.symbol === 'BZ=F') result.brent = { price: q.regularMarketPrice?.toFixed(2), change: q.regularMarketChangePercent?.toFixed(2), dir: (q.regularMarketChangePercent ?? 0) >= 0 ? 'up' : 'dn' };
      if (q.symbol === 'GC=F') result.gold  = { price: Math.round(q.regularMarketPrice)?.toString(), change: q.regularMarketChangePercent?.toFixed(2), dir: (q.regularMarketChangePercent ?? 0) >= 0 ? 'up' : 'dn' };
    });
    return result;
  } catch(e) { return {}; }
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

  const PSX_TICKERS = [
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    'HBL','MCB','UBL','NBP','ABL','BAFL',
    'ENGRO','FFC','EFERT','FFBL',
    'LUCK','MLCF','CHCC','DGKC'
  ];

  const tickers = (payload.tickers || PSX_TICKERS).filter(t => PSX_TICKERS.includes(t));

  // All in parallel
  const [priceResults, kse100, crypto, fx, sp500, commodities] = await Promise.all([
    Promise.all(tickers.map(async ticker => ({ ticker, data: await getPSXTick(ticker) }))),
    getKSE100(),
    getCrypto(),
    getFX(),
    getSP500(),
    getCommodities()
  ]);

  const prices = {};
  priceResults.forEach(({ ticker, data }) => { if (data) prices[ticker] = data; });

  console.log(`PSX: ${Object.keys(prices).length}/${tickers.length} | Crypto: ${crypto?.length ?? 0} | FX pairs: ${Object.keys(fx ?? {}).length} | SP500: ${sp500 ? 'ok' : 'fail'}`);

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ prices, kse100, crypto, fx, sp500, commodities, timestamp: new Date().toISOString() })
  };
};
