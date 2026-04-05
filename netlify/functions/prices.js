const https = require('https');

function get(url, extraHeaders = {}, ms = 9000) {
  return new Promise(resolve => {
    const t = setTimeout(() => { console.log(`TIMEOUT: ${url.slice(0,80)}`); resolve(null); }, ms);
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
        ...extraHeaders
      }
    };
    https.get(url, opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        clearTimeout(t);
        console.log(`${url.slice(0,60)} → status ${res.statusCode}, len ${b.length}`);
        try { resolve(JSON.parse(b)); } catch { resolve(null); }
      });
    }).on('error', e => { clearTimeout(t); console.log(`ERROR ${url.slice(0,60)}: ${e.message}`); resolve(null); });
  });
}

function fmp(path, ms = 9000) {
  const key = process.env.FMP_API_KEY;
  if (!key) { console.log('NO FMP KEY'); return Promise.resolve(null); }
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`;
  return get(url, {}, ms);
}

const PSX_HEADERS = { 'Origin': 'https://psxterminal.com', 'Referer': 'https://psxterminal.com/' };

// ── GET ALL PSX PRICES AT ONCE via market stats + individual ticks ──
async function getAllPSXPrices(tickers) {
  const prices = {};

  // Step 1: Get all market data from stats (gives us gainers/losers prices)
  try {
    const stats = await get('https://psxterminal.com/api/stats/REG', PSX_HEADERS);
    if (stats?.success && stats.data) {
      const allItems = [
        ...(stats.data.topGainers || []),
        ...(stats.data.topLosers || [])
      ];
      allItems.forEach(item => {
        if (!item.symbol || !item.price) return;
        if (tickers.includes(item.symbol)) {
          prices[item.symbol] = {
            price:  Number(item.price).toFixed(2),
            change: Number(item.changePercent * 100).toFixed(2),
            dir:    (item.changePercent || 0) >= 0 ? 'up' : 'dn',
            high:   null, low: null, volume: item.volume ? Number(item.volume).toLocaleString() : null
          };
        }
      });
      console.log(`Stats gave us prices for: ${Object.keys(prices).join(', ') || 'none'}`);
    }
  } catch(e) { console.log('Stats error:', e.message); }

  // Step 2: Fetch individual ticks for remaining tickers
  const missing = tickers.filter(t => !prices[t]);
  console.log(`Fetching individual ticks for ${missing.length} missing: ${missing.join(',')}`);

  if (missing.length > 0) {
    const results = await Promise.all(
      missing.map(ticker => get(`https://psxterminal.com/api/ticks/REG/${ticker}`, PSX_HEADERS))
    );

    results.forEach((resp, i) => {
      const ticker = missing[i];
      if (!resp) { console.log(`${ticker}: null response`); return; }

      // PSX Terminal wraps in {success, data, timestamp}
      const d = resp.data ?? resp;
      if (!d || typeof d !== 'object') { console.log(`${ticker}: bad data type`); return; }

      // Log first ticker's keys so we can debug field names
      if (i === 0) console.log(`${ticker} keys: ${Object.keys(d).join(',')}`);

      const price = d.price ?? d.currentPrice ?? d.close ?? d.lastTradedPrice;
      if (price == null) { console.log(`${ticker}: no price field, keys: ${Object.keys(d).join(',')}`); return; }

      const pNum = Number(price);
      // changePercent from PSX Terminal is decimal (0.018 = 1.8%) OR already percentage
      let pct = 0;
      if (d.changePercent != null) {
        const raw = Number(d.changePercent);
        // If absolute value < 1, it's decimal format (multiply by 100)
        pct = Math.abs(raw) < 1 ? raw * 100 : raw;
      } else if (d.change != null && d.ldcp != null) {
        const ldcp = Number(d.ldcp);
        if (ldcp !== 0) pct = (Number(d.change) / ldcp) * 100;
      }

      prices[ticker] = {
        price:  pNum.toFixed(2),
        change: pct.toFixed(2),
        high:   d.high   ? Number(d.high).toFixed(2)   : null,
        low:    d.low    ? Number(d.low).toFixed(2)     : null,
        volume: d.volume ? Number(d.volume).toLocaleString() : null,
        dir:    pct >= 0 ? 'up' : 'dn'
      };
      console.log(`${ticker}: PKR ${pNum.toFixed(2)} (${pct.toFixed(2)}%)`);
    });
  }

  return prices;
}

// ── KSE-100 ────────────────────────────────────────────────────
async function getKSE100() {
  // Try PSX Terminal KSE100 tick
  try {
    const resp = await get('https://psxterminal.com/api/ticks/REG/KSE100', PSX_HEADERS);
    if (resp) {
      const d = resp.data ?? resp;
      const price = d.price ?? d.currentPrice ?? d.close;
      if (price) {
        let pct = 0;
        if (d.changePercent != null) {
          const raw = Number(d.changePercent);
          pct = Math.abs(raw) < 1 ? raw * 100 : raw;
        }
        console.log(`KSE100 from tick: ${price} (${pct}%)`);
        return { price: Math.round(Number(price)).toLocaleString(), change: pct.toFixed(2), dir: pct >= 0 ? 'up' : 'dn' };
      }
    }
  } catch(e) { console.log('KSE100 tick error:', e.message); }

  // Try ALLSHR (all shares index) as proxy
  try {
    const resp = await get('https://psxterminal.com/api/ticks/REG/ALLSHR', PSX_HEADERS);
    if (resp) {
      const d = resp.data ?? resp;
      const price = d.price ?? d.currentPrice;
      if (price) {
        let pct = d.changePercent != null ? Number(d.changePercent) : 0;
        if (Math.abs(pct) < 1) pct = pct * 100;
        return { price: Math.round(Number(price)).toLocaleString(), change: pct.toFixed(2), dir: pct >= 0 ? 'up' : 'dn' };
      }
    }
  } catch(e) {}

  return null;
}

// ── COMMODITIES via FMP ────────────────────────────────────────
async function getCommodities() {
  const result = {};
  try {
    const d = await fmp('quote?symbol=GCUSD,BZUSD');
    console.log('Commodities raw:', JSON.stringify(d)?.slice(0, 200));
    const arr = Array.isArray(d) ? d : (d ? [d] : []);
    arr.forEach(q => {
      if (!q?.price) return;
      const item = { price: q.symbol === 'GCUSD' ? Math.round(q.price).toString() : Number(q.price).toFixed(2), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' };
      if (q.symbol === 'GCUSD') { result.gold = item; console.log('Gold:', item.price); }
      if (q.symbol === 'BZUSD') { result.brent = item; console.log('Brent:', item.price); }
    });
  } catch(e) { console.log('Commodities error:', e.message); }
  return result;
}

// ── S&P 500 ────────────────────────────────────────────────────
async function getSP500() {
  try {
    const d = await fmp('quote?symbol=SPY');
    const q = Array.isArray(d) ? d[0] : d;
    if (q?.price) { console.log('SP500:', q.price); return { price: q.price.toFixed(2), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' }; }
  } catch(e) { console.log('SP500 error:', e.message); }
  return null;
}

// ── CRYPTO via FMP ─────────────────────────────────────────────
async function getCrypto() {
  const TOP = ['BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','ADAUSD','AVAXUSD','DOTUSD','MATICUSD','LINKUSD'];
  try {
    const d = await fmp('batch-crypto-quotes?');
    console.log('Crypto batch type:', typeof d, Array.isArray(d) ? `array[${d?.length}]` : 'not array');
    if (Array.isArray(d) && d.length > 0) {
      const filtered = d.filter(q => TOP.includes(q.symbol) && q.price).sort((a,b) => TOP.indexOf(a.symbol) - TOP.indexOf(b.symbol));
      console.log(`Crypto: ${filtered.length} coins`);
      if (filtered.length > 0) return filtered.map(q => ({ symbol: q.symbol.replace('USD',''), price: q.price.toFixed(2), change: (q.changesPercentage ?? 0).toFixed(2), dir: (q.changesPercentage ?? 0) >= 0 ? 'up' : 'dn' }));
    }
  } catch(e) { console.log('Crypto error:', e.message); }

  // Fallback individual
  try {
    const results = await Promise.all(TOP.slice(0,5).map(sym => fmp(`quote-short?symbol=${sym}`)));
    return results.map((r,i) => { const q = Array.isArray(r)?r[0]:r; if (!q?.price) return null; return { symbol: TOP[i].replace('USD',''), price: q.price.toFixed(2), change: (q.changesPercentage??0).toFixed(2), dir: (q.changesPercentage??0)>=0?'up':'dn' }; }).filter(Boolean);
  } catch(e) { return []; }
}

// ── FOREX via FMP ──────────────────────────────────────────────
async function getFX() {
  const PAIRS = ['USDPKR','EURUSD','GBPUSD','USDJPY','USDSAR','USDAED'];
  try {
    const d = await fmp('batch-forex-quotes?');
    console.log('FX batch type:', typeof d, Array.isArray(d) ? `array[${d?.length}]` : 'not array');
    if (Array.isArray(d) && d.length > 0) {
      const fx = {};
      d.filter(q => PAIRS.includes(q.symbol)).forEach(q => {
        const rate = q.ask ?? q.bid ?? q.price;
        if (rate) fx[q.symbol] = { rate: Number(rate).toFixed(4), change: (q.changesPercentage??q.changes??0).toFixed(2), dir: (q.changesPercentage??0)>=0?'up':'dn' };
      });
      if (Object.keys(fx).length > 0) { console.log('FX pairs:', Object.keys(fx).join(',')); return fx; }
    }
  } catch(e) { console.log('FX error:', e.message); }

  // Fallback
  try {
    const fx = {};
    await Promise.all(PAIRS.map(async p => {
      const d = await fmp(`quote?symbol=${p}`);
      const q = Array.isArray(d)?d[0]:d;
      if (q?.price) fx[p] = { rate: Number(q.price).toFixed(4), change: (q.changesPercentage??0).toFixed(2), dir: (q.changesPercentage??0)>=0?'up':'dn' };
    }));
    return fx;
  } catch(e) { return {}; }
}

// ── PKR fallback ───────────────────────────────────────────────
async function getPKRFallback() {
  try {
    const d = await get('https://open.er-api.com/v6/latest/USD');
    if (d?.rates?.PKR) return { rate: d.rates.PKR.toFixed(2), change: '0', dir: 'up' };
  } catch(e) {}
  return null;
}

// ── MAIN ───────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'POST,GET,OPTIONS', 'Content-Type':'application/json', 'Cache-Control':'public, max-age=30' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) {}

  const PSX_TICKERS = ['OGDC','PPL','PSO','MARI','APL','HASCOL','HBL','MCB','UBL','NBP','ABL','BAFL','ENGRO','FFC','EFERT','FFBL','LUCK','MLCF','CHCC','DGKC'];
  const tickers = (payload.tickers || PSX_TICKERS).filter(t => PSX_TICKERS.includes(t));

  console.log('=== PRICES FUNCTION START ===');
  const [prices, kse100, commodities, crypto, fx, sp500] = await Promise.all([
    getAllPSXPrices(tickers),
    getKSE100(),
    getCommodities(),
    getCrypto(),
    getFX(),
    getSP500()
  ]);

  let finalFX = fx || {};
  if (!finalFX.USDPKR) { const pkr = await getPKRFallback(); if (pkr) finalFX.USDPKR = pkr; }

  console.log(`=== RESULT: PSX ${Object.keys(prices).length}/${tickers.length} | KSE ${kse100?.price||'X'} | Gold ${commodities?.gold?.price||'X'} | Brent ${commodities?.brent?.price||'X'} | SP500 ${sp500?.price||'X'} | Crypto ${crypto?.length||0} | FX ${Object.keys(finalFX).length} ===`);

  return { statusCode:200, headers, body: JSON.stringify({ prices, kse100, commodities, crypto, fx:finalFX, sp500, timestamp: new Date().toISOString() }) };
};
