// ── WALL-TRADE CRYPTO FUNCTION ────────────────────────────────
// All data via FMP (paid plan) — 4,500+ crypto, real-time quotes
// Env vars: FMP_API_KEY, ANTHROPIC_API_KEY

const https = require('https');

// ── COIN CONFIG — FMP symbols are e.g. BTCUSD ────────────────
const COINS = {
  BTC:   { fmp: 'BTCUSD',   name: 'Bitcoin'   },
  ETH:   { fmp: 'ETHUSD',   name: 'Ethereum'  },
  SOL:   { fmp: 'SOLUSD',   name: 'Solana'    },
  XRP:   { fmp: 'XRPUSD',   name: 'XRP'       },
  BNB:   { fmp: 'BNBUSD',   name: 'BNB'       },
  ADA:   { fmp: 'ADAUSD',   name: 'Cardano'   },
  AVAX:  { fmp: 'AVAXUSD',  name: 'Avalanche' },
  DOT:   { fmp: 'DOTUSD',   name: 'Polkadot'  },
  LINK:  { fmp: 'LINKUSD',  name: 'Chainlink' },
  MATIC: { fmp: 'MATICUSD', name: 'Polygon'   },
};

const ALLOWED = Object.keys(COINS);

// ── HTTP HELPER ───────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

// ── FETCH ALL 10 COIN PRICES VIA FMP ─────────────────────────
async function getAllCoinPrices(key) {
  // Try batch first (comma-separated) — works on FMP Starter for crypto
  const symbols = Object.values(COINS).map(c => c.fmp).join(',');
  let data = await fetchJSON(
    `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${key}`
  );

  // If batch fails (empty or error), try individual fetches
  if (!Array.isArray(data) || data.length === 0) {
    console.log('Crypto batch fetch failed — trying individual fetches');
    const individual = await Promise.all(
      Object.values(COINS).map(c =>
        fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=${c.fmp}&apikey=${key}`)
      )
    );
    data = individual.flat().filter(Boolean);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.log('All FMP crypto fetches failed');
    return null;
  }

  const result = {};
  data.forEach(q => {
    // Map FMP symbol back to our ticker (e.g. BTCUSD → BTC)
    const entry = Object.entries(COINS).find(([sym, cfg]) => cfg.fmp === q.symbol);
    if (!entry) return;
    const [sym] = entry;

    const price = q.price;
    const fmt = p => p >= 1000
      ? p.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : p >= 1 ? p.toFixed(4) : p.toFixed(6);

    result[sym] = {
      symbol:      sym,
      name:        COINS[sym].name,
      fmpSymbol:   q.symbol,
      price:       fmt(price),
      priceRaw:    price,
      change24h:   (q.changesPercentage || 0).toFixed(2) + '%',
      changeAmt:   (q.change || 0).toFixed(4),
      high24h:     (q.dayHigh || 0).toFixed(4),
      low24h:      (q.dayLow || 0).toFixed(4),
      open:        (q.open || 0).toFixed(4),
      prevClose:   (q.previousClose || 0).toFixed(4),
      marketCap:   q.marketCap ? '$' + (q.marketCap / 1e9).toFixed(2) + 'B' : 'N/A',
      volume24h:   q.volume ? '$' + (q.volume / 1e9).toFixed(2) + 'B' : 'N/A',
      yearHigh:    (q.yearHigh || 0).toFixed(4),
      yearLow:     (q.yearLow || 0).toFixed(4),
      dir:         (q.changesPercentage || 0) >= 0 ? 'up' : 'dn',
      exchange:    q.exchange || 'CRYPTO',
      timestamp:   q.timestamp
    };
  });
  return result;
}

// ── FETCH MACRO CONTEXT (VIX + DXY via FMP) ──────────────────
async function getCryptoMacro(key) {
  const macro = {};
  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=%5EVIX,DX-Y.NYB&apikey=${key}`
    );
    if (Array.isArray(data)) {
      data.forEach(q => {
        if (q.symbol === '^VIX')     macro.vix = { price: q.price?.toFixed(2), change: q.changesPercentage?.toFixed(2) };
        if (q.symbol === 'DX-Y.NYB') macro.dxy = { price: q.price?.toFixed(2), change: q.changesPercentage?.toFixed(2) };
      });
    }
  } catch(e) {}

  // PKR/USD via FMP forex
  try {
    const fxData = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${key}`
    );
    if (Array.isArray(fxData) && fxData[0]) {
      macro.pkrusd = parseFloat(fxData[0].price).toFixed(2);
    }
  } catch(e) {}

  return macro;
}

// ── AI VERDICT ────────────────────────────────────────────────
async function generateCryptoVerdict(coinData, macro) {
  const pkrPrice = coinData.priceRaw && macro.pkrusd
    ? (coinData.priceRaw * parseFloat(macro.pkrusd)).toLocaleString('en-PK', { maximumFractionDigits: 0 })
    : 'N/A';

  const prompt = `You are a crypto analyst for Wall-Trade — an AI markets intelligence platform for Pakistani investors.

LIVE DATA FOR ${coinData.symbol} — ${coinData.name} (via FMP):
Price: $${coinData.price} (PKR ~${pkrPrice} at current rate)
24h Change: ${coinData.change24h} | 24h Range: $${coinData.low24h} – $${coinData.high24h}
Market Cap: ${coinData.marketCap} | 24h Volume: ${coinData.volume24h}
52W Range: $${coinData.yearLow} – $${coinData.yearHigh}

MACRO CONTEXT:
VIX Fear Index: ${macro.vix?.price || 'N/A'} (${macro.vix?.change || 'N/A'}% today) — above 25 = risk-off
USD Index (DXY): ${macro.dxy?.price || 'N/A'} (${macro.dxy?.change || 'N/A'}% today) — strong dollar pressures crypto
PKR/USD: ${macro.pkrusd || '~278'} — key for Pakistani P2P investors
SBP Policy Rate: 10.50% — crypto vs. fixed income context for Pakistani investors

PAKISTAN CONTEXT:
- P2P via Binance is primary access route for Pakistani investors
- PKR depreciation makes USD-denominated crypto a hedge consideration
- FBR taxes crypto capital gains — factor into net return expectations

Return ONLY this JSON (no markdown):
{
  "verdict": "Bullish" or "Neutral" or "Bearish",
  "score": <1-10>,
  "headline": "<one sharp line max 12 words>",
  "body": "<100-130 words. Verdict, momentum driver, macro angle, Pakistan-specific angle, one key risk. Plain English.>",
  "insights": [
    {"icon":"<emoji>","value":"<metric>","label":"<max 10 words>","color":"green|amber|red|purple"},
    {"icon":"<emoji>","value":"<metric>","label":"<max 10 words>","color":"green|amber|red|purple"},
    {"icon":"<emoji>","value":"<metric>","label":"<max 10 words>","color":"green|amber|red|purple"}
  ],
  "signals": [{"label":"<2-3 word signal>","type":"green|amber|red|purple"}],
  "pkrContext": "<1 sentence for Pakistani investor specifically>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514', max_tokens: 900,
      system: 'Sharp crypto analyst for Pakistani retail investors. Use live data. Specific numbers. Pakistan P2P/PKR context always. No buy/sell advice.',
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch(e) {
    console.error('Crypto AI error:', e.message);
    return null;
  }
}

// ── VERDICT CACHE (6h TTL) ────────────────────────────────────
const cache = {};
const TTL = 6 * 60 * 60 * 1000;
function getCached(sym) { const c = cache[sym]; return (c && Date.now() - c.ts < TTL) ? c.data : null; }
function setCache(sym, data) { cache[sym] = { data, ts: Date.now() }; }

// ── MAIN HANDLER ─────────────────────────────────────────────
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const key = process.env.FMP_API_KEY;
  if (!key) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'FMP API key not configured' }) };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) {}
  const { action, symbol, question } = payload;

  // ── ALL PRICES ─────────────────────────────────────────────
  if (!action || action === 'prices') {
    const prices = await getAllCoinPrices(key);
    if (!prices) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'FMP unavailable' }) };
    return {
      statusCode: 200,
      headers: { ...CORS, 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ prices, source: 'FMP', timestamp: new Date().toISOString() })
    };
  }

  // ── SINGLE COIN VERDICT ────────────────────────────────────
  if (action === 'verdict') {
    const sym = (symbol || '').toUpperCase();
    if (!ALLOWED.includes(sym)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unsupported coin. Supported: ${ALLOWED.join(', ')}` }) };

    const cached = getCached(sym);
    if (cached) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ...cached, cached: true }) };

    const [prices, macro] = await Promise.all([getAllCoinPrices(key), getCryptoMacro(key)]);
    const coinData = prices?.[sym];
    if (!coinData) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: `No data for ${sym} from FMP` }) };

    const verdict = await generateCryptoVerdict(coinData, macro);
    const response = { coinData, verdict, macro, source: 'FMP', timestamp: new Date().toISOString() };
    setCache(sym, response);
    return { statusCode: 200, headers: CORS, body: JSON.stringify(response) };
  }

  // ── ASK QUESTION ABOUT COIN ────────────────────────────────
  if (action === 'question') {
    const sym = (symbol || '').toUpperCase();
    if (!ALLOWED.includes(sym)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unsupported coin' }) };
    const safeQ = (question || '').replace(/[<>{}[\]\\]/g, '').slice(0, 500);
    if (!safeQ) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Question required' }) };

    const [prices, macro] = await Promise.all([getAllCoinPrices(key), getCryptoMacro(key)]);
    const cd = prices?.[sym];

    const prompt = `Pakistani retail investor asks about ${sym} (${COINS[sym].name}):
Live price: $${cd?.price || 'N/A'} | 24h: ${cd?.change24h || 'N/A'} | Market cap: ${cd?.marketCap || 'N/A'}
VIX: ${macro.vix?.price || 'N/A'} | DXY: ${macro.dxy?.price || 'N/A'} | PKR/USD: ${macro.pkrusd || '~278'}
Question: "${safeQ}"
Answer directly using live data. Include Pakistan P2P/Binance/PKR context where relevant. 3-5 sentences. No buy/sell advice.`;

    try {
      const result = await callAnthropic({
        model: 'claude-sonnet-4-20250514', max_tokens: 500,
        system: 'Crypto analyst for Pakistani retail investors. Direct, specific, data-driven. No buy/sell advice.',
        messages: [{ role: 'user', content: prompt }]
      });
      const answer = result.content?.map(i => i.text || '').join('').trim();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ answer, coinData: cd, timestamp: new Date().toISOString() }) };
    } catch(e) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI unavailable' }) };
    }
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid action. Use: prices, verdict, question' }) };
};
