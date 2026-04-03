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
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// ── PSX TERMINAL — single stock tick ──────────────────────────
async function getPSXTick(ticker) {
  try {
    const resp = await fetchJSON(`https://psxterminal.com/api/ticks/REG/${ticker}`);
    if (!resp) return null;

    // Response: {success:true, data:{market,st,symbol,price,...}, timestamp}
    const d = resp.data ?? resp;
    if (!d || typeof d !== 'object') return null;

    const price  = d.price;
    const ldcp   = d.ldcp   ?? d.previousClose ?? d.prevClose;
    const change = d.change ?? (price && ldcp ? price - ldcp : 0);
    const pct    = d.changePercent ?? (ldcp ? (change / ldcp * 100) : 0);
    const high   = d.high;
    const low    = d.low;
    const volume = d.volume ?? d.totalVolume;

    if (price == null) {
      console.log(`${ticker}: price is null, data keys: ${Object.keys(d).join(',')}`);
      return null;
    }

    return {
      price:  Number(price).toFixed(2),
      change: Number(pct).toFixed(2),
      high:   high   ? Number(high).toFixed(2)   : null,
      low:    low    ? Number(low).toFixed(2)     : null,
      volume: volume ? Number(volume).toLocaleString() : null,
      dir:    Number(pct) >= 0 ? 'up' : 'dn'
    };
  } catch(e) {
    console.error(`Tick error ${ticker}:`, e.message);
    return null;
  }
}

// ── PSX TERMINAL — batch all symbols via market data ──────────
async function getAllPSXPrices(tickers) {
  try {
    // Try to get all market data in one call
    const data = await fetchJSON('https://psxterminal.com/api/ticks/REG');
    if (!data) return {};

    const list = data.success ? data.data : (Array.isArray(data) ? data : null);
    if (!list || !Array.isArray(list)) return {};

    console.log(`Market data: ${list.length} symbols`);

    const prices = {};
    list.forEach(d => {
      const sym = d.symbol ?? d.ticker ?? d.code;
      if (!sym || !tickers.includes(sym)) return;

      const price        = d.price ?? d.currentPrice ?? d.close ?? d.last;
      const changePercent= d.changePercent ?? d.pctChange ?? d.changePct ?? 0;

      if (!price) return;

      prices[sym] = {
        price:  Number(price).toFixed(2),
        change: Number(changePercent * (Math.abs(changePercent) > 1 ? 1 : 100)).toFixed(2),
        high:   d.high   ? Number(d.high).toFixed(2)   : null,
        low:    d.low    ? Number(d.low).toFixed(2)     : null,
        volume: d.volume ? Number(d.volume).toLocaleString() : null,
        dir:    Number(changePercent) >= 0 ? 'up' : 'dn'
      };
    });

    return prices;
  } catch(e) {
    console.error('Batch error:', e.message);
    return {};
  }
}

// ── KSE-100 INDEX ─────────────────────────────────────────────
async function getKSE100() {
  try {
    // Try PSX Terminal first
    const data = await fetchJSON('https://psxterminal.com/api/ticks/REG/KSE100');
    if (data) {
      const d = data.success ? data.data : data;
      const dd = Array.isArray(d) ? d[0] : d;
      if (dd) {
        const price = dd.price ?? dd.currentPrice ?? dd.close;
        const chg   = dd.changePercent ?? dd.pctChange ?? 0;
        if (price) return {
          price:  Math.round(Number(price)).toLocaleString(),
          change: Number(chg * (Math.abs(chg) > 1 ? 1 : 100)).toFixed(2),
          dir:    Number(chg) >= 0 ? 'up' : 'dn'
        };
      }
    }
    // Fallback to Yahoo Finance
    const ydata = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (!ydata?.chart?.result?.[0]) return null;
    const closes = ydata.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
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

  const ALLOWED = [
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    'HBL','MCB','UBL','NBP','ABL','BAFL','BAHL','MEBL','FABL',
    'ENGRO','FFBL','FFC','EFERT',
    'LUCK','MLCF','CHCC','DGKC','PIOC','FCCL',
    'TRG','SYS','NETSOL','PAKT','PNSC','SNGP','SSGC'
  ];

  const tickers = (payload.tickers || ALLOWED).filter(t => ALLOWED.includes(t));

  // Try batch first, fall back to individual
  const [batchPrices, kse100, commodities, pkrusd] = await Promise.all([
    getAllPSXPrices(tickers),
    getKSE100(),
    getCommodities(),
    getPKRUSD()
  ]);

  // For any missing tickers, try individual calls
  const missingTickers = tickers.filter(t => !batchPrices[t]);
  let prices = { ...batchPrices };

  if (missingTickers.length > 0) {
    console.log(`Batch got ${Object.keys(batchPrices).length}, fetching ${missingTickers.length} individually`);
    const individualResults = await Promise.all(
      missingTickers.map(async ticker => ({ ticker, data: await getPSXTick(ticker) }))
    );
    individualResults.forEach(({ ticker, data }) => {
      if (data) prices[ticker] = data;
    });
  }

  console.log(`Prices fetched: ${Object.keys(prices).length}/${tickers.length} tickers`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ prices, kse100, commodities, pkrusd, timestamp: new Date().toISOString() })
  };
};
