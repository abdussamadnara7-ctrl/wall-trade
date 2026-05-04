const https = require('https');
const http = require('http');

function get(url, ms = 10000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => { console.log('TIMEOUT:', url); resolve(null); }, ms);
    lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`${url.slice(0, 75)} → ${res.statusCode} len=${body.length}`);
        resolve(body);
      });
    }).on('error', e => { clearTimeout(timer); console.log('ERR:', e.message); resolve(null); });
  });
}

function parsePSXData(html) {
  if (!html) return { stocks: {}, kse100: null };
  try {
    // Extract the giant data object from the HTML
    const match = html.match(/REG:\{(.+?)\},FUT:/s);
    if (!match) { console.log('REG block not found'); return { stocks: {}, kse100: null }; }

    const regBlock = match[1];
    const stockMatches = regBlock.matchAll(/"?([A-Z0-9]+)"?:\{market:"REG",st:"OPN",symbol:"([A-Z0-9]+)",price:([\d.]+),change:([-\d.]+),changePercent:([-\d.]+),volume:(\d+)[^}]*\}/g);

    const stocks = {};
    for (const m of stockMatches) {
      const symbol = m[2];
      const price = parseFloat(m[3]);
      const changeAmt = parseFloat(m[4]);
      const changePct = parseFloat(m[5]);
      const volume = m[6];
      const changePctFinal = Math.abs(changePct) < 1.0 ? changePct * 100 : changePct;

      stocks[symbol] = {
        price:     price.toFixed(2),
        change:    changePctFinal.toFixed(2),
        changeAmt: changeAmt.toFixed(2),
        volume:    volume,
        dir:       changePctFinal >= 0 ? 'up' : 'dn',
        currency:  'PKR'
      };
    }

    // Extract KSE100
    const kse100Match = html.match(/KSE100:\{market:"IDX"[^}]*price:([\d.]+),change:([-\d.]+),changePercent:([-\d.]+)/);
    let kse100 = null;
    if (kse100Match) {
      const price = parseFloat(kse100Match[1]);
      const changePct = parseFloat(kse100Match[3]);
      const changePctFinal = Math.abs(changePct) < 1.0 ? changePct * 100 : changePct;
      kse100 = {
        price:  Math.round(price).toLocaleString(),
        raw:    Math.round(price),
        change: changePctFinal.toFixed(2),
        dir:    changePctFinal >= 0 ? 'up' : 'dn'
      };
    }

    console.log(`Parsed ${Object.keys(stocks).length} stocks from proxy`);
    return { stocks, kse100 };
  } catch(e) {
    console.log('Parse error:', e.message);
    return { stocks: {}, kse100: null };
  }
}

// FMP helpers unchanged
function getJson(url, ms = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { clearTimeout(timer); try { resolve(JSON.parse(body)); } catch(e) { resolve(null); } });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

async function getCommodities(key) {
  if (!key) return {};
  const results = {};
  const BRENT_SYMBOLS = ['BZUSD', 'OUSX', 'CLUSD', 'WTIUSD'];
  const GOLD_SYMBOLS  = ['GCUSD', 'XAUUSD', 'GOLDUSD'];
  const allSymbols = [...BRENT_SYMBOLS, ...GOLD_SYMBOLS];
  const fetches = await Promise.all(
    allSymbols.map(sym =>
      getJson(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, 6000)
        .then(d => ({ sym, q: Array.isArray(d) ? d[0] : null }))
    )
  );
  for (const sym of BRENT_SYMBOLS) {
    const q = fetches.find(f => f.sym === sym)?.q;
    if (q?.price && parseFloat(q.price) > 30 && parseFloat(q.price) < 200) {
      const chg = parseFloat(q.changesPercentage ?? 0);
      results.brent = { price: parseFloat(q.price).toFixed(2), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      break;
    }
  }
  for (const sym of GOLD_SYMBOLS) {
    const q = fetches.find(f => f.sym === sym)?.q;
    if (q?.price && parseFloat(q.price) > 1000 && parseFloat(q.price) < 5000) {
      const chg = parseFloat(q.changesPercentage ?? 0);
      results.gold = { price: Math.round(parseFloat(q.price)).toString(), change: chg.toFixed(2), dir: chg >= 0 ? 'up' : 'dn' };
      break;
    }
  }
  return results;
}

async function getPKRUSD(key) {
  if (!key) return null;
  try {
    const data = await getJson(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price) return { rate: parseFloat(q.price).toFixed(2) };
  } catch(e) {}
  return null;
}

async function getSP500(key) {
  if (!key) return null;
  try {
    const data = await getJson(`https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=${key}`);
    const q = Array.isArray(data) ? data[0] : null;
    if (!q?.price) return null;
    return { price: parseFloat(q.price).toFixed(2), change: parseFloat(q.changesPercentage ?? 0).toFixed(2) };
  } catch(e) { return null; }
}

async function getCrypto(key) {
  if (!key) return [];
  const WANT = ['BTCUSD','ETHUSD','SOLUSD','XRPUSD','BNBUSD','ADAUSD','AVAXUSD','DOTUSD','MATICUSD','LINKUSD'];
  const individual = await Promise.all(
    WANT.map(sym =>
      getJson(`https://financialmodelingprep.com/stable/quote?symbol=${sym}&apikey=${key}`, 6000)
        .then(d => ({ sym, q: Array.isArray(d) ? d[0] : null }))
    )
  );
  const results = [];
  individual.forEach(({ sym, q }) => {
    if (q?.price != null && parseFloat(q.price) > 0) {
      const change = parseFloat(q.changesPercentage ?? 0);
      results.push({
        symbol: sym.replace('USD', ''),
        price:  parseFloat(q.price).toFixed(2),
        change: change.toFixed(2),
        change24h: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
        dir:    change >= 0 ? 'up' : 'dn'
      });
    }
  });
  return results;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
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

  // Fetch everything in parallel
  const [html, commodities, pkrusd, sp500, crypto] = await Promise.all([
    get('http://188.166.245.128:3000/'),
    getCommodities(key),
    getPKRUSD(key),
    getSP500(key),
    getCrypto(key)
  ]);

  const { stocks: allStocks, kse100 } = parsePSXData(html);

  // Filter to only requested tickers
  const psxPrices = {};
  requestedTickers.forEach(ticker => {
    if (allStocks[ticker]) psxPrices[ticker] = allStocks[ticker];
  });

  console.log(`PSX prices: ${Object.keys(psxPrices).length}/${requestedTickers.length}`);

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
