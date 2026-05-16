const http = require('http');
const ti   = require('technicalindicators');

const PSX_PROXY = '188.166.245.128';
const PSX_PORT  = 3000;

function fetchFromProxy(path) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 10000);
    http.get({
      hostname: PSX_PROXY,
      port:     PSX_PORT,
      path:     path,
      headers:  { 'User-Agent': 'WallTrade/1.0' }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function calculateIndicators(closes) {
  if (!closes || closes.length < 50) return null;
  try {
    const rsiValues = ti.RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiValues.length > 0 ? Math.round(rsiValues[rsiValues.length - 1] * 100) / 100 : null;

    const ma20Values = ti.SMA.calculate({ values: closes, period: 20 });
    const ma50Values = ti.SMA.calculate({ values: closes, period: 50 });
    const ma20 = ma20Values.length > 0 ? Math.round(ma20Values[ma20Values.length - 1] * 100) / 100 : null;
    const ma50 = ma50Values.length > 0 ? Math.round(ma50Values[ma50Values.length - 1] * 100) / 100 : null;

    const macdValues = ti.MACD.calculate({
      values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
      SimpleMAOscillator: false, SimpleMASignal: false
    });
    const latestMACD = macdValues.length > 0 ? macdValues[macdValues.length - 1] : null;
    const macd = latestMACD ? {
      line:      Math.round((latestMACD.MACD      || 0) * 100) / 100,
      signal:    Math.round((latestMACD.signal    || 0) * 100) / 100,
      histogram: Math.round((latestMACD.histogram || 0) * 100) / 100,
    } : null;

    const bbValues = ti.BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    const latestBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : null;
    let bb = null;
    if (latestBB) {
      const currentPrice = closes[closes.length - 1];
      const percentB = latestBB.upper !== latestBB.lower
        ? (currentPrice - latestBB.lower) / (latestBB.upper - latestBB.lower)
        : 0.5;
      bb = {
        upper:    Math.round(latestBB.upper  * 100) / 100,
        middle:   Math.round(latestBB.middle * 100) / 100,
        lower:    Math.round(latestBB.lower  * 100) / 100,
        percentB: Math.round(percentB        * 100) / 100,
      };
    }

    return { rsi, ma20, ma50, macd, bb };
  } catch(e) {
    console.error('Indicator error:', e.message);
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type':                 'application/json',
    'Cache-Control':                'public, max-age=300',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const { ticker, type } = event.queryStringParameters || {};

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const eodPath = '/timeseries/eod/' + cleanTicker;
  const intPath = '/timeseries/int/' + cleanTicker;

  const [eodData, intData] = await Promise.all([
    fetchFromProxy(eodPath),
    type === 'int' ? fetchFromProxy(intPath) : Promise.resolve(null)
  ]);

  if (!eodData || !eodData.data) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'No data from proxy' }) };
  }

  const eodSorted = [...eodData.data].sort((a, b) => a[0] - b[0]);
  const closes    = eodSorted.map(d => parseFloat(d[1])).filter(p => p > 0);
  const indicators = calculateIndicators(closes);

  const priceData = (type === 'int' && intData && intData.data) ? intData.data : eodData.data;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ data: priceData, indicators })
  };
};
