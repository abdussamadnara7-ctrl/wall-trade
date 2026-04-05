const https = require('https');

function get(url, extraHeaders = {}, ms = 8000) {
  return new Promise(resolve => {
    const t = setTimeout(() => { console.log(`TIMEOUT: ${url.slice(0,70)}`); resolve(null); }, ms);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json', ...extraHeaders }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        clearTimeout(t);
        try { resolve(JSON.parse(b)); } catch { resolve(null); }
      });
    }).on('error', e => { clearTimeout(t); console.log(`ERR ${url.slice(0,60)}: ${e.message}`); resolve(null); });
  });
}

// FMP — single symbol only (comma-separated fails on Starter)
function fmp(path) {
  const key = process.env.FMP_API_KEY;
  if (!key) return Promise.resolve(null);
  const sep = path.includes('?') ? '&' : '?';
  return get(`https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`);
}

const PSX_H = { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' };

// ── PSX ticks in batches of 5 with 300ms delay ────────────────
async function batchedTicks(tickers) {
  const prices = {};
  const BATCH = 5;
  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(ticker => get(`https://psxterminal.com/api/ticks/REG/${ticker}`, PSX_H, 6000))
    );
    results.forEach((resp, j) => {
      const ticker = batch[j];
      if (!resp) return;
      const d = resp.data ?? resp;
      if (!d || typeof d !== 'object' || !d.price) return;
      const pNum = Number(d.price);
      const rawPct = d.changePercent ?? 0;
      const pct = Math.abs(Number(rawPct)) < 1 ? Number(rawPct) * 100 : Number(rawPct);
      prices[ticker] = { price: pNum.toFixed(2), change: pct.toFixed(2), dir: pct >= 0 ? 'up' : 'dn', volume: d.volume ? Number(d.volume).toLocaleString() : null };
      console.log(`${ticker}: PKR ${pNum.toFixed(2)} (${pct.toFixed(2)}%)`);
    });
    // Wait 300ms between batches to avoid 503
    if (i + BATCH < tickers.length) await new Promise(r => setTimeout(r, 300));
  }
  return prices;
}

// ── KSE-100: try multiple PSX Terminal index endpoints ─────────
async function getKSE100() {
  const attempts = [
    'ticks/IDX/KSE100',
    'ticks/IDX/KSE-100',
    'index/KSE100',
    'market/index/KSE100',
    'ticks/REG/KSE-100'
  ];
  for (const path of attempts) {
    const resp = await get(`https://psxterminal.com/api/${path}`, PSX_H, 5000);
    if (!resp) continue;
    const d = resp.data ?? resp;
    const price = d?.price ?? d?.value ?? d?.close ?? d?.currentPrice;
    if (price && Number(price) > 10000) { // KSE-100 is always above 10,000
      const rawPct = d.changePercent ?? 0;
      const pct = Math.abs(Number(rawPct)) < 1 ? Number(rawPct) * 100 : Number(rawPct);
      console.log(`KSE100 via ${path}: ${price} (${pct}%)`);
      return { price: Math.round(Number(price)).toLocaleString(), change: pct.toFixed(2), dir: pct >= 0 ? 'up' : 'dn' };
    }
  }
  console.log('KSE100: all endpoints failed');
  return null;
}

// ── GOLD via FMP — try multiple symbol formats ─────────────────
async function getGold() {
  // Try each symbol separately — comma-separated returns [] on Starter
  const symbols = ['GCUSD', 'XAUUSD', 'GC=F', 'GOLD'];
  for (const sym of symbols) {
    const d = await fmp(`quote?symbol=${sym}`);
    const q = Array.isArray(d) ? d[0] : d;
    if (q?.price && q.price > 100) { // Gold is always > $100
      console.log(`Gold via ${sym}: ${q.price}`);
      return { price: Math.round(q.price).toString(), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
    }
  }
  // Try commodities endpoint
  const d = await fmp('commodities-prices?');
  if (Array.isArray(d)) {
    const gold = d.find(c => c.symbol === 'GCUSD' || c.name?.includes('Gold'));
    if (gold?.price) return { price: Math.round(gold.price).toString(), change: (gold.changesPercentage ?? 0).toFixed(2), dir: (gold.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
  }
  console.log('Gold: all attempts failed');
  return null;
}

// ── BRENT via FMP — try multiple symbol formats ────────────────
async function getBrent() {
  const symbols = ['BZUSD', 'USOIL', 'CL=F', 'BRTUSD'];
  for (const sym of symbols) {
    const d = await fmp(`quote?symbol=${sym}`);
    const q = Array.isArray(d) ? d[0] : d;
    if (q?.price && q.price > 20 && q.price < 300) { // Brent is always $20-$300
      console.log(`Brent via ${sym}: ${q.price}`);
      return { price: Number(q.price).toFixed(2), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
    }
  }
  // Try commodities endpoint
  const d = await fmp('commodities-prices?');
  if (Array.isArray(d)) {
    const brent = d.find(c => c.symbol === 'BZUSD' || c.name?.includes('Brent') || c.name?.includes('Oil'));
    if (brent?.price) return { price: Number(brent.price).toFixed(2), change: (brent.changesPercentage ?? 0).toFixed(2), dir: (brent.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
  }
  console.log('Brent: all attempts failed');
  return null;
}

// ── S&P 500 ────────────────────────────────────────────────────
async function getSP500() {
  const d = await fmp('quote?symbol=SPY');
  const q = Array.isArray(d) ? d[0] : d;
  if (q?.price) return { price: q.price.toFixed(2), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
  return null;
}

// ── CRYPTO — individual quote-short (confirmed working) ────────
async function getCrypto() {
  const COINS = [
    { sym: 'BTCUSD', label: 'BTC' }, { sym: 'ETHUSD', label: 'ETH' },
    { sym: 'BNBUSD', label: 'BNB' }, { sym: 'SOLUSD', label: 'SOL' },
    { sym: 'XRPUSD', label: 'XRP' }, { sym: 'ADAUSD', label: 'ADA' },
    { sym: 'AVAXUSD',label: 'AVAX'},{ sym: 'DOTUSD', label: 'DOT' },
    { sym: 'LINKUSD',label: 'LINK'},{ sym: 'MATICUSD',label:'MATIC'}
  ];
  // Batch in groups of 5 to avoid rate limits
  const results = [];
  for (let i = 0; i < COINS.length; i += 5) {
    const batch = COINS.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(c => fmp(`quote-short?symbol=${c.sym}`)));
    batchResults.forEach((d, j) => {
      const q = Array.isArray(d) ? d[0] : d;
      if (!q?.price) return;
      results.push({ symbol: batch[j].label, price: Number(q.price).toFixed(2), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' });
    });
    if (i + 5 < COINS.length) await new Promise(r => setTimeout(r, 200));
  }
  console.log(`Crypto: ${results.length} coins`);
  return results;
}

// ── FOREX — individual quotes (confirmed working) ──────────────
async function getFX() {
  const PAIRS = ['USDPKR','EURUSD','GBPUSD','USDJPY','USDSAR','USDAED'];
  const fx = {};
  const results = await Promise.all(PAIRS.map(p => fmp(`quote?symbol=${p}`)));
  results.forEach((d, i) => {
    const q = Array.isArray(d) ? d[0] : d;
    if (!q?.price) return;
    fx[PAIRS[i]] = { rate: Number(q.price).toFixed(4), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
  });
  console.log(`FX: ${Object.keys(fx).join(',')}`);
  return fx;
}

// ── MAIN ───────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) {}

  const ALL_TICKERS = ['OGDC','PPL','PSO','MARI','APL','HASCOL','HBL','MCB','UBL','NBP','ABL','BAFL','ENGROH','FFC','EFERT','LUCK','MLCF','CHCC','DGKC'];
  const tickers = (payload.tickers || ALL_TICKERS).filter(t => ALL_TICKERS.includes(t));

  console.log('=== START ===');

  // Run independent fetches in parallel, PSX stocks batched separately
  const [psxPrices, kse100, gold, brent, sp500, crypto, fx] = await Promise.all([
    batchedTicks(tickers),
    getKSE100(),
    getGold(),
    getBrent(),
    getSP500(),
    getCrypto(),
    getFX()
  ]);

  // PKR fallback if FMP forex missed it
  let finalFX = fx;
  if (!finalFX.USDPKR) {
    try {
      const d = await get('https://open.er-api.com/v6/latest/USD');
      if (d?.rates?.PKR) finalFX.USDPKR = { rate: d.rates.PKR.toFixed(2), change: '0', dir: 'up' };
    } catch(e) {}
  }

  const commodities = { gold, brent };
  console.log(`=== DONE: PSX ${Object.keys(psxPrices).length}/${tickers.length} | KSE ${kse100?.price||'X'} | Gold ${gold?.price||'X'} | Brent ${brent?.price||'X'} | SP500 ${sp500?.price||'X'} | Crypto ${crypto.length} | FX ${Object.keys(finalFX).length} ===`);

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ prices: psxPrices, kse100, commodities, crypto, fx: finalFX, sp500, timestamp: new Date().toISOString() })
  };
};
