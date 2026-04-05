const https = require('https');

// ── CORE FETCH ────────────────────────────────────────────────
function get(url, headers = {}, ms = 8000) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(null), ms);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...headers
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    }).on('error', () => { clearTimeout(t); resolve(null); });
  });
}

// FMP — appends apikey correctly
function fmp(path, ms = 8000) {
  const key = process.env.FMP_API_KEY;
  if (!key) return Promise.resolve(null);
  const sep = path.includes('?') ? '&' : '?';
  return get(`https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`, {}, ms);
}

// PSX Terminal — confirmed accessible from Netlify
function psx(path, ms = 7000) {
  return get(`https://psxterminal.com/api/${path}`, {
    'Origin': 'https://psxterminal.com',
    'Referer': 'https://psxterminal.com/'
  }, ms);
}

// ── KSE-100 ───────────────────────────────────────────────────
async function getKSE100() {
  // PSX Terminal market stats — confirmed working
  try {
    const d = await psx('stats/REG');
    if (d?.success && d.data) {
      // stats doesn't give KSE-100 directly, try ticks
    }
  } catch(e) {}

  // Try PSX Terminal KSE100 tick
  try {
    const d = await psx('ticks/REG/KSE100');
    if (d) {
      const x = d.data ?? d;
      const price = x.price ?? x.currentPrice ?? x.close;
      if (price) {
        const pct = x.changePercent ?? x.change ?? 0;
        return {
          price: Math.round(Number(price)).toLocaleString(),
          change: Number(pct).toFixed(2),
          dir: Number(pct) >= 0 ? 'up' : 'dn'
        };
      }
    }
  } catch(e) {}

  // FMP index fallback
  try {
    const d = await fmp('quote?symbol=KSE.KA');
    const q = Array.isArray(d) ? d[0] : d;
    if (q?.price) return {
      price: Math.round(q.price).toLocaleString(),
      change: (q.changesPercentage ?? 0).toFixed(2),
      dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
    };
  } catch(e) {}

  return null;
}

// ── PSX STOCK TICK ────────────────────────────────────────────
async function getPSXTick(ticker) {
  try {
    const resp = await psx(`ticks/REG/${ticker}`);
    if (!resp) return null;
    const d = resp.data ?? resp;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    const price = d.price ?? d.currentPrice ?? d.close;
    if (price == null) return null;
    const pNum  = Number(price);
    const ldcp  = d.ldcp ?? d.previousClose;
    const ldcpN = ldcp != null ? Number(ldcp) : null;
    const rawPct = d.changePercent ?? (ldcpN && ldcpN !== 0 ? (pNum - ldcpN) / ldcpN * 100 : 0);
    const pct = Number(rawPct);
    return {
      price:  pNum.toFixed(2),
      change: pct.toFixed(2),
      high:   d.high   ? Number(d.high).toFixed(2)   : null,
      low:    d.low    ? Number(d.low).toFixed(2)     : null,
      volume: d.volume ? Number(d.volume).toLocaleString() : null,
      dir:    pct >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── COMMODITIES via FMP (confirmed Starter) ───────────────────
async function getCommodities() {
  const result = {};
  try {
    // FMP commodity quotes - GCUSD = Gold, BZUSD = Brent
    const d = await fmp('quote?symbol=GCUSD,BZUSD');
    const arr = Array.isArray(d) ? d : (d ? [d] : []);
    arr.forEach(q => {
      if (!q?.price) return;
      const item = {
        price:  q.symbol === 'GCUSD' ? Math.round(q.price).toString() : Number(q.price).toFixed(2),
        change: (q.changesPercentage ?? 0).toFixed(2),
        dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
      };
      if (q.symbol === 'GCUSD') result.gold  = item;
      if (q.symbol === 'BZUSD') result.brent = item;
    });
    console.log(`Commodities: gold=${!!result.gold} brent=${!!result.brent}`);
  } catch(e) { console.error('Commodities error:', e.message); }
  return result;
}

// ── S&P 500 via FMP (confirmed Starter) ──────────────────────
async function getSP500() {
  try {
    const d = await fmp('quote?symbol=SPY');
    const q = Array.isArray(d) ? d[0] : d;
    if (!q?.price) return null;
    return {
      price:  q.price.toFixed(2),
      change: (q.changesPercentage ?? 0).toFixed(2),
      dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── CRYPTO via FMP (confirmed Starter) ───────────────────────
async function getCrypto() {
  const TOP = ['BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','ADAUSD','AVAXUSD','DOTUSD','MATICUSD','LINKUSD'];
  try {
    const d = await fmp('batch-crypto-quotes?');
    if (Array.isArray(d) && d.length > 0) {
      const filtered = d
        .filter(q => TOP.includes(q.symbol) && q.price)
        .sort((a, b) => TOP.indexOf(a.symbol) - TOP.indexOf(b.symbol));
      if (filtered.length > 0) {
        console.log(`Crypto batch: ${filtered.length} coins`);
        return filtered.map(q => ({
          symbol: q.symbol.replace('USD',''),
          price:  q.price.toFixed(2),
          change: (q.changesPercentage ?? 0).toFixed(2),
          dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
        }));
      }
    }
  } catch(e) { console.error('Crypto batch error:', e.message); }

  // Fallback: individual quote-short
  try {
    const results = await Promise.all(TOP.map(sym => fmp(`quote-short?symbol=${sym}`)));
    return results.map((r, i) => {
      const q = Array.isArray(r) ? r[0] : r;
      if (!q?.price) return null;
      return {
        symbol: TOP[i].replace('USD',''),
        price:  q.price.toFixed(2),
        change: (q.changesPercentage ?? 0).toFixed(2),
        dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
      };
    }).filter(Boolean);
  } catch(e) { return []; }
}

// ── FOREX via FMP (confirmed Starter) ────────────────────────
async function getFX() {
  const PAIRS = ['USDPKR','EURUSD','GBPUSD','USDJPY','USDSAR','USDAED'];
  try {
    const d = await fmp('batch-forex-quotes?');
    if (Array.isArray(d) && d.length > 0) {
      const fx = {};
      d.filter(q => PAIRS.includes(q.symbol) && (q.ask || q.bid || q.price))
       .forEach(q => {
         fx[q.symbol] = {
           rate:   Number(q.ask ?? q.bid ?? q.price).toFixed(4),
           change: (q.changesPercentage ?? q.changes ?? 0).toFixed(2),
           dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
         };
       });
      if (Object.keys(fx).length > 0) {
        console.log(`FX batch: ${Object.keys(fx).length} pairs`);
        return fx;
      }
    }
  } catch(e) { console.error('FX batch error:', e.message); }

  // Fallback: individual quotes
  try {
    const fx = {};
    const results = await Promise.all(PAIRS.map(p => fmp(`quote?symbol=${p}`)));
    results.forEach((r, i) => {
      const q = Array.isArray(r) ? r[0] : r;
      if (q?.price) fx[PAIRS[i]] = {
        rate:   Number(q.price).toFixed(4),
        change: (q.changesPercentage ?? 0).toFixed(2),
        dir:    (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn'
      };
    });
    return fx;
  } catch(e) { return {}; }
}

// ── PKR/USD fallback via ExchangeRate API ─────────────────────
async function getPKRFallback() {
  try {
    const d = await get('https://open.er-api.com/v6/latest/USD');
    if (d?.rates?.PKR) return { rate: d.rates.PKR.toFixed(2), change: '0', dir: 'up' };
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

  const PSX_TICKERS = [
    'OGDC','PPL','PSO','MARI','APL','HASCOL',
    'HBL','MCB','UBL','NBP','ABL','BAFL',
    'ENGRO','FFC','EFERT','FFBL',
    'LUCK','MLCF','CHCC','DGKC'
  ];
  const tickers = (payload.tickers || PSX_TICKERS).filter(t => PSX_TICKERS.includes(t));

  // Run everything in parallel
  const [psxResults, kse100, commodities, crypto, fx, sp500] = await Promise.all([
    Promise.all(tickers.map(async t => ({ ticker: t, data: await getPSXTick(t) }))),
    getKSE100(),
    getCommodities(),
    getCrypto(),
    getFX(),
    getSP500()
  ]);

  const prices = {};
  psxResults.forEach(({ ticker, data }) => { if (data) prices[ticker] = data; });

  // If FX missing PKR, use fallback
  let finalFX = fx;
  if (!finalFX?.USDPKR) {
    const pkr = await getPKRFallback();
    if (pkr) finalFX = { ...finalFX, USDPKR: pkr };
  }

  console.log([
    `PSX: ${Object.keys(prices).length}/${tickers.length}`,
    `KSE: ${kse100 ? kse100.price : 'fail'}`,
    `Gold: ${commodities.gold?.price ?? 'fail'}`,
    `Brent: ${commodities.brent?.price ?? 'fail'}`,
    `SP500: ${sp500?.price ?? 'fail'}`,
    `Crypto: ${crypto.length}`,
    `FX: ${Object.keys(finalFX).length}`
  ].join(' | '));

  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      prices, kse100, commodities,
      crypto, fx: finalFX, sp500,
      timestamp: new Date().toISOString()
    })
  };
};
