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

// ── PSX STOCK PRICES — PSX Terminal ───────────────────────────
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

// ── COMMODITIES: BRENT + GOLD — FMP batch-commodity-quotes ────
// FMP Starter confirmed endpoint: /stable/batch-commodity-quotes
// Known working symbols: OUSX (Brent), GCUSD (Gold), CLUSD (WTI)
async function getCommodities(key) {
  if (!key) return {};
  const results = {};

  try {
    const data = await get(
      `https://financialmodelingprep.com/stable/batch-commodity-quotes?apikey=${key}`
    );

    console.log('Commodities raw type:', typeof data, Array.isArray(data) ? `array[${data.length}]` : 'not array');
    if (Array.isArray(data) && data.length > 0) {
      // Log first few symbols to identify correct ones
      console.log('Commodity symbols sample:', data.slice(0, 10).map(q => q.symbol).join(','));
    }

    if (!Array.isArray(data)) return results;

    data.forEach(q => {
      if (!q?.symbol || q?.price == null) return;
      const sym = q.symbol.toUpperCase();
      const change = parseFloat(q.changesPercentage ?? q.change ?? 0);
      const price = parseFloat(q.price);

      // Brent crude — try multiple possible symbols
      if (['BZUSD','OUSX','BZO','BRENTOIL','BRENT','CLUSD','WTIUSD','OILUS'].includes(sym)) {
        if (!results.brent) { // take first match
          results.brent = {
            price:  price.toFixed(2),
            change: change.toFixed(2),
            dir:    change >= 0 ? 'up' : 'dn',
            symbol: sym
          };
          console.log(`Brent found: ${sym} = $${price}`);
        }
      }

      // Gold — try multiple possible symbols
      if (['GCUSD','XAUUSD','GOLD','GOLDS','GCQ'].includes(sym)) {
        if (!results.gold) {
          results.gold = {
            price:  Math.round(price).toString(),
            change: change.toFixed(2),
            dir:    change >= 0 ? 'up' : 'dn',
            symbol: sym
          };
          console.log(`Gold found: ${sym} = $${price}`);
        }
      }
    });

    // If Brent not found by symbol, find by price range ($60-$120 = likely oil)
    if (!results.brent && Array.isArray(data)) {
      const oilCandidate = data.find(q => {
        const p = parseFloat(q.price);
        return p > 50 && p < 150 && (
          q.symbol?.includes('CL') || q.symbol?.includes('BZ') ||
          q.symbol?.includes('OIL') || q.symbol?.includes('WTI') ||
          q.symbol?.includes('BRENT')
        );
      });
      if (oilCandidate) {
        const change = parseFloat(oilCandidate.changesPercentage ?? oilCandidate.change ?? 0);
        results.brent = {
          price:  parseFloat(oilCandidate.price).toFixed(2),
          change: change.toFixed(2),
          dir:    change >= 0 ? 'up' : 'dn',
          symbol: oilCandidate.symbol
        };
        console.log(`Brent fallback: ${oilCandidate.symbol} = $${oilCandidate.price}`);
      }
    }

    // If Gold not found by symbol, find by price range ($1800-$3500 = likely gold)
    if (!results.gold && Array.isArray(data)) {
      const goldCandidate = data.find(q => {
        const p = parseFloat(q.price);
        return p > 1500 && p < 4000 && (
          q.symbol?.includes('GC') || q.symbol?.includes('XAU') ||
          q.symbol?.includes('GOLD')
        );
      });
      if (goldCandidate) {
        const change = parseFloat(goldCandidate.changesPercentage ?? goldCandidate.change ?? 0);
        results.gold = {
          price:  Math.round(parseFloat(goldCandidate.price)).toString(),
          change: change.toFixed(2),
          dir:    change >= 0 ? 'up' : 'dn',
          symbol: goldCandidate.symbol
        };
        console.log(`Gold fallback: ${goldCandidate.symbol} = $${goldCandidate.price}`);
      }
    }

  } catch(e) { console.log('Commodities error:', e.message); }

  // ── Yahoo Finance fallback if FMP commodities fail ──────────
  if (!results.brent) {
    try {
      const d = await get('https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=2d', {}, 5000);
      if (d?.chart?.result?.[0]) {
        const closes = d.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
        if (closes?.length >= 2) {
          const cur = closes[closes.length - 1], prev = closes[closes.length - 2];
          const chg = ((cur - prev) / prev * 100);
          results.brent = { price: cur.toFixed(2), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn', symbol: 'BZ=F' };
          console.log(`Brent Yahoo fallback: $${cur.toFixed(2)}`);
        }
      }
    } catch(e) {}
  }

  if (!results.gold) {
    try {
      const d = await get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d', {}, 5000);
      if (d?.chart?.result?.[0]) {
        const closes = d.chart.result[0].indicators?.quote?.[0]?.close?.filter(v => v != null);
        if (closes?.length >= 2) {
          const cur = closes[closes.length - 1], prev = closes[closes.length - 2];
          const chg = ((cur - prev) / prev * 100);
          results.gold = { price: Math.round(cur).toString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn', symbol: 'GC=F' };
          console.log(`Gold Yahoo fallback: $${Math.round(cur)}`);
        }
      }
    } catch(e) {}
  }

  console.log('Commodities result:', JSON.stringify(results));
  return results;
}

// ── PKR/USD — FMP ─────────────────────────────────────────────
async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await get(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price) return { rate: parseFloat(q.price).toFixed(2) };
  } catch(e) {}

  // Fallback: batch-forex-quotes
  try {
    const key2 = process.env.FMP_API_KEY;
    const data = await get(`https://financialmodelingprep.com/stable/batch-forex-quotes?apikey=${key2}`);
    if (Array.isArray(data)) {
      const pkr = data.find(q => q.symbol === 'USDPKR');
      if (pkr?.price) return { rate: parseFloat(pkr.price).toFixed(2) };
    }
  } catch(e) {}

  return null;
}

// ── S&P 500 — FMP ─────────────────────────────────────────────
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

// ── CRYPTO — FMP batch-crypto-quotes ─────────────────────────
// FMP Starter confirmed endpoint: /stable/batch-crypto-quotes
// Symbols format: BTCUSD, ETHUSD, etc.
async function getCrypto(key) {
  if (!key) return [];

  const WANT = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD'];
  const results = [];

  try {
    // Try batch endpoint first
    const data = await get(
      `https://financialmodelingprep.com/stable/batch-crypto-quotes?apikey=${key}`
    );

    console.log('Crypto batch type:', typeof data, Array.isArray(data) ? `array[${data.length}]` : 'not array');

    if (Array.isArray(data) && data.length > 0) {
      console.log('Crypto sample symbols:', data.slice(0, 5).map(q => q.symbol).join(','));

      WANT.forEach(sym => {
        const q = data.find(d => d.symbol === sym);
        if (q?.price != null) {
          const change = parseFloat(q.changesPercentage ?? q.change ?? 0);
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
    }

    // If batch failed, try individual quotes
    if (results.length === 0) {
      console.log('Crypto batch empty — trying individual quotes');
      const individual = await Promise.all(
        WANT.map(sym =>
          get(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, {}, 5000)
            .then(d => ({ sym, data: Array.isArray(d) ? d[0] : d }))
        )
      );

      individual.forEach(({ sym, data: q }) => {
        if (q?.price != null && parseFloat(q.price) > 0) {
          const change = parseFloat(q.changesPercentage ?? q.changesPercentage ?? 0);
          results.push({
            symbol:    sym.replace('USD', ''),
            price:     parseFloat(q.price).toFixed(2),
            change:    change.toFixed(2),
            change24h: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
            dir:       change >= 0 ? 'up' : 'dn'
          });
          console.log(`Crypto ${sym} individual: $${q.price}`);
        }
      });
    }

  } catch(e) { console.log('Crypto error:', e.message); }

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

  // Run all in parallel
  const [psxResult, kse100Result] = await Promise.all([
    getPSXPrices(requestedTickers),
    getKSE100()
  ]);

  const [commodities, pkrusd, sp500, crypto] = await Promise.all([
    getCommodities(key),
    getPKRUSD(key),
    getSP500(key),
    getCrypto(key)
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      prices:      psxResult,
      kse100:      kse100Result,
      commodities: commodities,
      pkrusd:      pkrusd,
      sp500:       sp500,
      crypto:      crypto,
      timestamp:   new Date().toISOString()
    })
  };
};
