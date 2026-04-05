const https = require('https');

// ── FETCH HELPERS ─────────────────────────────────────────────
function fetchJSON(url, headers = {}, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
        ...headers
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

function fetchFMP(path, timeoutMs = 7000) {
  const key = process.env.FMP_API_KEY;
  if (!key) return Promise.resolve(null);
  // Ensure correct URL format: path already has ? for first param, we add &apikey
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`;
  return fetchJSON(url, {}, timeoutMs);
}

// ── PSX TERMINAL — single stock ───────────────────────────────
async function getPSXTick(ticker) {
  try {
    const resp = await fetchJSON(
      `https://psxterminal.com/api/ticks/REG/${ticker}`,
      { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' }
    );
    if (!resp) return null;
    const d = resp.data ?? resp;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    const price = d.price ?? d.currentPrice ?? d.close;
    const ldcp  = d.ldcp ?? d.previousClose ?? d.prevClose;
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

// ── KSE-100 — try multiple sources ────────────────────────────
async function getKSE100() {
  // Try Yahoo Finance
  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (data?.chart?.result?.[0]) {
      const closes = data.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes && closes.length >= 2) {
        const cur = closes[closes.length - 1], prev = closes[closes.length - 2];
        const chg = ((cur - prev) / prev * 100);
        return { price: Math.round(cur).toLocaleString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      }
    }
  } catch(e) {}
  
  // Try PSX Terminal index
  try {
    const data = await fetchJSON('https://psxterminal.com/api/ticks/REG/KSE100',
      { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' }
    );
    if (data) {
      const d = data.data ?? data;
      const price = d.price ?? d.currentPrice ?? d.close;
      const pct   = d.changePercent ?? 0;
      if (price) return {
        price: Math.round(Number(price)).toLocaleString(),
        change: Number(pct).toFixed(2),
        dir: Number(pct) >= 0 ? 'up' : 'dn'
      };
    }
  } catch(e) {}
  
  return null;
}

// ── COMMODITIES — Brent + Gold ────────────────────────────────
async function getCommodities() {
  const result = {};
  
  // Try Yahoo Finance v7
  try {
    const data = await fetchJSON(
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=BZ%3DF,GC%3DF&fields=symbol,regularMarketPrice,regularMarketChangePercent'
    );
    const quotes = data?.quoteResponse?.result || [];
    quotes.forEach(q => {
      if (q.symbol === 'BZ=F' && q.regularMarketPrice) {
        result.brent = { price: q.regularMarketPrice.toFixed(2), change: q.regularMarketChangePercent?.toFixed(2) || '0', dir: (q.regularMarketChangePercent || 0) >= 0 ? 'up' : 'dn' };
      }
      if (q.symbol === 'GC=F' && q.regularMarketPrice) {
        result.gold  = { price: Math.round(q.regularMarketPrice).toString(), change: q.regularMarketChangePercent?.toFixed(2) || '0', dir: (q.regularMarketChangePercent || 0) >= 0 ? 'up' : 'dn' };
      }
    });
  } catch(e) {}

  // Fallback: try FMP commodity quotes
  if (!result.brent || !result.gold) {
    try {
      const data = await fetchFMP('quote?symbol=BZUSD,GCUSD');
      if (Array.isArray(data)) {
        data.forEach(q => {
          if (q.symbol === 'BZUSD' && !result.brent) result.brent = { price: q.price?.toFixed(2), change: q.changesPercentage?.toFixed(2) || '0', dir: (q.changesPercentage || 0) >= 0 ? 'up' : 'dn' };
          if (q.symbol === 'GCUSD' && !result.gold)  result.gold  = { price: Math.round(q.price)?.toString(), change: q.changesPercentage?.toFixed(2) || '0', dir: (q.changesPercentage || 0) >= 0 ? 'up' : 'dn' };
        });
      }
    } catch(e) {}
  }

  return result;
}

// ── CRYPTO via FMP (confirmed Starter endpoints) ──────────────
async function getCrypto() {
  const TOP_SYMBOLS = ['BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','ADAUSD','AVAXUSD','DOTUSD','MATICUSD','LINKUSD'];
  
  try {
    // Try batch endpoint first
    const data = await fetchFMP('batch-crypto-quotes?');
    if (Array.isArray(data) && data.length > 0) {
      const filtered = data
        .filter(q => TOP_SYMBOLS.includes(q.symbol))
        .sort((a, b) => TOP_SYMBOLS.indexOf(a.symbol) - TOP_SYMBOLS.indexOf(b.symbol));
      
      if (filtered.length > 0) {
        return filtered.map(q => ({
          symbol:    q.symbol.replace('USD', ''),
          price:     Number(q.price).toFixed(2),
          change:    Number(q.changesPercentage ?? 0).toFixed(2),
          marketCap: q.marketCap,
          volume:    q.volume,
          dir:       (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
        }));
      }
    }
  } catch(e) { console.error('Crypto batch error:', e.message); }

  // Fallback: individual quote-short calls
  try {
    const results = await Promise.all(
      TOP_SYMBOLS.map(sym => fetchFMP(`quote-short?symbol=${sym}`))
    );
    return results
      .map((r, i) => {
        const q = Array.isArray(r) ? r[0] : r;
        if (!q?.price) return null;
        return {
          symbol: TOP_SYMBOLS[i].replace('USD', ''),
          price:  Number(q.price).toFixed(2),
          change: Number(q.changesPercentage ?? 0).toFixed(2),
          dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
        };
      })
      .filter(Boolean);
  } catch(e) {
    console.error('Crypto fallback error:', e.message);
    return [];
  }
}

// ── FOREX via FMP (confirmed Starter endpoints) ───────────────
async function getFX() {
  const PAIRS = ['USDPKR','EURUSD','GBPUSD','USDJPY','USDSAR','USDAED'];

  try {
    // Try batch forex endpoint
    const data = await fetchFMP('batch-forex-quotes?');
    if (Array.isArray(data) && data.length > 0) {
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
      if (Object.keys(fx).length > 0) return fx;
    }
  } catch(e) { console.error('FX batch error:', e.message); }

  // Fallback: individual quote calls
  try {
    const fx = {};
    const results = await Promise.all(PAIRS.map(pair => fetchFMP(`quote?symbol=${pair}`)));
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
  } catch(e) {
    console.error('FX fallback error:', e.message);
    return {};
  }
}

// ── S&P 500 via FMP ───────────────────────────────────────────
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

  // Fetch everything in parallel
  const [priceResults, kse100, commodities, crypto, fx, sp500] = await Promise.all([
    Promise.all(tickers.map(async ticker => ({ ticker, data: await getPSXTick(ticker) }))),
    getKSE100(),
    getCommodities(),
    getCrypto(),
    getFX(),
    getSP500()
  ]);

  const prices = {};
  priceResults.forEach(({ ticker, data }) => { if (data) prices[ticker] = data; });

  console.log(`PSX: ${Object.keys(prices).length}/${tickers.length} | KSE: ${kse100 ? 'ok' : 'fail'} | Brent: ${commodities.brent ? 'ok' : 'fail'} | Gold: ${commodities.gold ? 'ok' : 'fail'} | Crypto: ${crypto.length} | FX: ${Object.keys(fx).length} | SP500: ${sp500 ? 'ok' : 'fail'}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ prices, kse100, commodities, crypto, fx, sp500, timestamp: new Date().toISOString() })
  };
};
