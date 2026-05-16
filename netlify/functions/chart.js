const https = require('https');

const PSX_PROXY = '188.166.245.128';
const PSX_PORT  = 3000;

function fetchFromProxy(path) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 10000);
    const req = require('http').get({
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
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { ticker, type } = event.queryStringParameters || {};

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const path = type === 'eod'
    ? '/timeseries/eod/' + cleanTicker
    : '/timeseries/int/' + cleanTicker;

  const data = await fetchFromProxy(path);

  if (!data) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'No data from proxy' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(data)
  };
};
