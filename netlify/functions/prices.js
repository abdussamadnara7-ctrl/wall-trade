const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0' } }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

async function getPSXPrices(tickers) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;

  try {
    // FMP batch quote endpoint
    const symbols = tickers.map(t => `${t}.KA`).join(',');
    const data = await fetchJSON(
      `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${key}`
    );

    if (!data || !Array.isArray(data)) return null;

    const prices = {};
    data.forEach(q => {
      const ticker = q.symbol?.replace('.KA', '');
      if (ticker && tickers.includes(ticker)) {
        prices[ticker] = {
          price:  q.price?.toFixed(2),
          change: q.changesPercentage?.toFixed(2),
          high:   q.dayHigh?.toFixed(2),
          low:    q.dayLow?.toFixed(2),
          volume: q.volume,
          open:   q.open?.toFixed(2),
          prev:   q.previousClose?.toFixed(2)
        };
      }
    });

    return Object.keys(prices).length > 0 ? prices : null;
  } catch(e) {
    console.error('FMP prices error:', e.message);
    return null;
  }
}

async function getKSE100() {
  try {
    const data = await fetchJSON(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d'
    );
    if (!data?.chart?.result?.[0]) return null;
    const r = data.chart.result[0];
    const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 2) return null;
    const current = closes[closes.length - 1];
    const prev    = closes[closes.length - 2];
    return {
      price:  current.toFixed(0),
      change: ((current - prev) / prev * 100).toFixed(2),
      prev:   prev.toFixed(0)
    };
  } catch(e) { return null; }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=30'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { payload = {}; }

  const ALLOWED = ['OGDC','PPL','PSO','MARI','APL','HASCOL','ENGRO','HBL','LUCK','MCB','UBL','NBP','FFBL','FFC','MLCF'];
  const tickers = (payload.tickers || ALLOWED).filter(t => ALLOWED.includes(t));

  const [prices, kse100] = await Promise.all([
    getPSXPrices(tickers),
    getKSE100()
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      prices:    prices || {},
      kse100:    kse100 || null,
      timestamp: new Date().toISOString(),
      source:    prices ? 'fmp_live' : 'unavailable'
    })
  };
};
