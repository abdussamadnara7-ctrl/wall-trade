const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    const opts = {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)', ...headers }
    };
    https.get(url, opts, res => {
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

  // Fetch each ticker individually from PSX Terminal
  // PSX Terminal: https://psxterminal.com/api/ticks/stock/{TICKER}
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
    // PSX Terminal KSE-100 index
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

// ── GLOBAL MACRO VIA FMP (US market data) ────────────────────
async function getGlobalMacro() {
  const key = process.env.FMP_API_KEY;
  const macro = {};

  if (!key) return macro;

  try {
    // S&P 500 — global risk sentiment
    const sp500 = await fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${key}`);
    if (sp500?.[0]) {
      macro.sp500 = {
        price:  sp500[0].price?.toFixed(2),
        change: sp500[0].changesPercentage?.toFixed(2)
      };
    }
  } catch(e) {}

  try {
    // Gold ETF (GLD) — safe haven sentiment
    const gold = await fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=GLD&apikey=${key}`);
    if (gold?.[0]) {
      macro.goldETF = {
        price:  gold[0].price?.toFixed(2),
        change: gold[0].changesPercentage?.toFixed(2)
      };
    }
  } catch(e) {}

  try {
    // US Oil ETF (USO) — oil price proxy via FMP
    const uso = await fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=USO&apikey=${key}`);
    if (uso?.[0]) {
      macro.oilETF = {
        price:  uso[0].price?.toFixed(2),
        change: uso[0].changesPercentage?.toFixed(2)
      };
    }
  } catch(e) {}

  try {
    // USD Index (UUP ETF) — dollar strength
    const uup = await fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=UUP&apikey=${key}`);
    if (uup?.[0]) {
      macro.usdETF = {
        price:  uup[0].price?.toFixed(2),
        change: uup[0].changesPercentage?.toFixed(2)
      };
    }
  } catch(e) {}

  return macro;
}

// ── BRENT CRUDE + GOLD (Yahoo Finance backup) ─────────────────
async function getCommodities() {
  const results = {};

  try {
    const data = await fetchJSON('https://query1.finance.yahoo.com/v7/finance/quote?symbols=BZ%3DF,GC%3DF,DX-Y.NYB&fields=symbol,regularMarketPrice,regularMarketChangePercent');
    const quotes = data?.quoteResponse?.result || [];
    quotes.forEach(q => {
      if (q.symbol === 'BZ=F') results.brent = { price: q.regularMarketPrice?.toFixed(2), change: q.regularMarketChangePercent?.toFixed(2) };
      if (q.symbol === 'GC=F') results.gold  = { price: Math.round(q.regularMarketPrice)?.toString(), change: q.regularMarketChangePercent?.toFixed(2) };
      if (q.symbol === 'DX-Y.NYB') results.dxy = { price: q.regularMarketPrice?.toFixed(2), change: q.regularMarketChangePercent?.toFixed(2) };
    });
  } catch(e) {}

  return results;
}

// ── PKR/USD ───────────────────────────────────────────────────
async function getPKRUSD() {
  try {
    const key = process.env.FMP_API_KEY;
    const data = await fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`);
    // FMP returns array: [{symbol:'USDPKR', price:278.50, ...}]
    const rate = Array.isArray(data) ? data[0]?.price : data?.rates?.PKR;
    if (rate) return { rate: parseFloat(rate).toFixed(2) };
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

  // Default PSX tickers if none provided
  const ALLOWED = [
    // Energy & Oil
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    // Banking
    'HBL','MCB','UBL','NBP','ABL','BAFL','BAHL','MEBL','FABL',
    // Fertiliser — ENGROH replaces ENGRO (delisted Jan 2025)
    'ENGROH','FFBL','FFC','EFERT',
    // Cement
    'LUCK','MLCF','CHCC','DGKC','PIOC','FCCL',
    // Tech & Other
    'TRG','SYS','NETSOL','PAKT','PNSC','SNGP','SSGC'
  ];

  const requestedTickers = (payload.tickers || ALLOWED).filter(t => ALLOWED.includes(t));

  // Fetch everything in parallel
  const [psxPrices, kse100, commodities, pkrusd, globalMacro] = await Promise.all([
    getPSXPrices(requestedTickers),
    getKSE100(),
    getCommodities(),
    getPKRUSD(),
    getGlobalMacro()
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      prices:      psxPrices,
      kse100:      kse100,
      commodities: commodities,
      pkrusd:      pkrusd,
      globalMacro: globalMacro,
      timestamp:   new Date().toISOString(),
      sources: {
        psx:    'PSX Terminal',
        macro:  'FMP (US ETFs)',
        pkrusd: 'ExchangeRate-API'
      }
    })
  };
};
