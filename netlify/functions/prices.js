const https = require('https');

// ── HELPERS ────────────────────────────────────────────────────
function get(url, extraHeaders = {}, ms = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { console.log('TIMEOUT:', url.slice(0, 70)); resolve(null); }, ms);
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

// ── PSX STOCK PRICES ───────────────────────────────────────────
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
        high:      d.high   ? parseFloat(d.high).toFixed(2)  : null,
        low:       d.low    ? parseFloat(d.low).toFixed(2)   : null,
        volume:    d.volume ? String(d.volume) : null,
        dir:       change >= 0 ? 'up' : 'dn',
        currency:  'PKR'
      };
    });

    if (i + BATCH < tickers.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`PSX prices: ${Object.keys(results).length}/${tickers.length} — ${Object.keys(results).join(',')}`);
  return results;
}

// ── KSE-100 INDEX ──────────────────────────────────────────────
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

// ── COMMODITIES: BRENT + GOLD — FMP individual quotes ─────────
// batch-commodity-quotes returns 402 on Starter plan
// Individual /stable/quote confirmed working (same as crypto)
// Try multiple symbols since FMP naming varies
async function getCommodities(key) {
  if (!key) return {};
  const results = {};

  // Try symbol variants in order — stop at first success
  const BRENT_SYMBOLS = ['BZUSD', 'OUSX', 'CLUSD', 'WTIUSD'];
  const GOLD_SYMBOLS  = ['GCUSD', 'XAUUSD', 'GOLDUSD'];

  // Fetch all candidates in parallel
  const allSymbols = [...BRENT_SYMBOLS, ...GOLD_SYMBOLS];
  const fetches = await Promise.all(
    allSymbols.map(sym =>
      get(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, {}, 6000)
        .then(d => ({ sym, q: Array.isArray(d) ? d[0] : null }))
    )
  );

  // Find first working Brent symbol
  for (const sym of BRENT_SYMBOLS) {
    const match = fetches.find(f => f.sym === sym);
    const q = match?.q;
    if (q?.price && parseFloat(q.price) > 30 && parseFloat(q.price) < 200) {
      const chg = parseFloat(q.changesPercentage ?? 0);
      results.brent = { price: parseFloat(q.price).toFixed(2), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      console.log(`Brent (FMP ${sym}): $${q.price}`);
      break;
    }
  }

  // Find first working Gold symbol
  for (const sym of GOLD_SYMBOLS) {
    const match = fetches.find(f => f.sym === sym);
    const q = match?.q;
    if (q?.price && parseFloat(q.price) > 1000 && parseFloat(q.price) < 5000) {
      const chg = parseFloat(q.changesPercentage ?? 0);
      results.gold = { price: Math.round(parseFloat(q.price)).toString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      console.log(`Gold (FMP ${sym}): $${q.price}`);
      break;
    }
  }

  console.log('Commodities result:', JSON.stringify(results));
  return results;
}

// ── PKR/USD — FMP individual quote (confirmed 200) ─────────────
async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await get(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price) return { rate: parseFloat(q.price).toFixed(2) };
  } catch(e) {}
  return null;
}

// ── S&P 500 — FMP individual quote (confirmed 200) ─────────────
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

// ── CRYPTO — FMP individual quotes (confirmed 200 in logs) ─────
// batch-crypto-quotes returns 402 on Starter plan — individual quotes work fine
async function getCrypto(key) {
  if (!key) return [];

  const WANT = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD'];

  const individual = await Promise.all(
    WANT.map(sym =>
      get(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, {}, 6000)
        .then(d => ({ sym, q: Array.isArray(d) ? d[0] : null }))
    )
  );

  const results = [];
  individual.forEach(({ sym, q }) => {
    if (q?.price != null && parseFloat(q.price) > 0) {
      const change = parseFloat(q.changesPercentage ?? 0);
      results.push({
        symbol:    sym.replace('USD', ''),
        price:     parseFloat(q.price).toFixed(2),
        change:    change.toFixed(2),
        change24h: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
        dir:       change >= 0 ? 'up' : 'dn'
      });
      console.log(`Crypto ${sym}: $${q.price}`);
    }
  });

  console.log(`Crypto result: ${results.map(c => c.symbol).join(',')}`);
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

  const [psxPrices, kse100] = await Promise.all([
    getPSXPrices(requestedTickers),
    getKSE100()
  ]);

  const [commodities, pkrusd, sp500, crypto] = await Promise.all([
    getCommodities(key),  // FMP individual quotes
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
