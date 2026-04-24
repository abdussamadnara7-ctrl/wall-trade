const https = require('https');

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const hardTimeout = setTimeout(() => reject(new Error('Anthropic timeout')), 18000);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { clearTimeout(hardTimeout); try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', e => { clearTimeout(hardTimeout); reject(e); });
    req.write(data);
    req.end();
  });
}

function fetchURL(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { console.log('TIMEOUT:', url.slice(0, 60)); resolve(null); }, timeoutMs);
    const req = https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)'
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`${url.slice(0, 65)} → ${res.statusCode} len=${body.length}`);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', e => { clearTimeout(timer); console.log('ERR:', e.message); resolve(null); });
  });
}

function fetchFMP(path, timeoutMs = 5000) {
  const key = process.env.FMP_API_KEY;
  if (!key) return Promise.resolve(null);
  const sep = path.includes('?') ? '&' : '?';
  return fetchURL(`https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`, timeoutMs);
}

// ── COINGECKO ID MAP — free API, no key needed, works from Netlify ──
const COINGECKO_IDS = {
  BTC:   'bitcoin',
  ETH:   'ethereum',
  SOL:   'solana',
  XRP:   'ripple',
  BNB:   'binancecoin',
  ADA:   'cardano',
  AVAX:  'avalanche-2',
  DOT:   'polkadot',
  MATIC: 'matic-network',
  LINK:  'chainlink'
};

// Cache
const cache = {};
const CACHE_TTL = 20 * 60 * 1000; // 20 mins

// ── FETCH PRICE: FMP first, CoinGecko fallback ─────────────────
async function fetchCoinPrice(symbol) {
  const fmpSymbol = `${symbol}USD`;

  // Try FMP individual quote first (confirmed 200 for BTC/ETH/SOL/XRP/BNB)
  try {
    const data = await fetchFMP(`quote?symbol=${fmpSymbol}`, 5000);
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.price && Number(q.price) > 0) {
      const change = parseFloat(q.changesPercentage ?? q.changesPercentage ?? 0);
      console.log(`${symbol} via FMP: $${q.price}`);
      return {
        price:     Number(q.price).toFixed(symbol === 'BTC' ? 2 : 4),
        change:    change.toFixed(2),
        yearHigh:  q.yearHigh,
        yearLow:   q.yearLow,
        marketCap: q.marketCap,
        volume:    q.volume,
        dayHigh:   q.dayHigh,
        dayLow:    q.dayLow,
        priceAvg50:  q.priceAvg50,
        priceAvg200: q.priceAvg200,
        source:    'FMP'
      };
    }
  } catch(e) {}

  // CoinGecko fallback — free, no key, works for ALL 10 coins
  const cgId = COINGECKO_IDS[symbol];
  if (cgId) {
    try {
      const data = await fetchURL(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
        6000
      );
      const coin = data?.[cgId];
      if (coin?.usd && coin.usd > 0) {
        const change = coin.usd_24h_change ?? 0;
        console.log(`${symbol} via CoinGecko: $${coin.usd}`);
        return {
          price:     Number(coin.usd).toFixed(coin.usd >= 1 ? 2 : 6),
          change:    change.toFixed(2),
          marketCap: coin.usd_market_cap,
          volume:    coin.usd_24h_vol,
          source:    'CoinGecko'
        };
      }
    } catch(e) { console.log(`CoinGecko ${symbol} error:`, e.message); }
  }

  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { symbol, question } = payload;
  if (!symbol) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };

  const sym = symbol.toUpperCase();

  // Check cache
  const cacheKey = question ? `q_${sym}_${question.slice(0, 40)}` : `v_${sym}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`Cache hit: ${sym}`);
    return { statusCode: 200, headers, body: JSON.stringify(cached.data) };
  }

  // ── FETCH LIVE PRICE ───────────────────────────────────────
  const priceData = await fetchCoinPrice(sym);

  if (!priceData || !priceData.price || Number(priceData.price) === 0) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: 'price_unavailable',
        message: `Live price for ${sym} is temporarily unavailable. Please try again shortly.`
      })
    };
  }

  const price  = priceData.price;
  const change = priceData.change;

  // Build market data context
  const marketData = [];
  if (priceData.yearHigh)    marketData.push(`52W High: $${Number(priceData.yearHigh).toLocaleString()}`);
  if (priceData.yearLow)     marketData.push(`52W Low: $${Number(priceData.yearLow).toLocaleString()}`);
  if (priceData.marketCap)   marketData.push(`Market Cap: $${(priceData.marketCap / 1e9).toFixed(1)}B`);
  if (priceData.priceAvg50)  marketData.push(`50-Day MA: $${Number(priceData.priceAvg50).toLocaleString()} (${Number(price) > priceData.priceAvg50 ? 'ABOVE — bullish' : 'BELOW — bearish'})`);
  if (priceData.priceAvg200) marketData.push(`200-Day MA: $${Number(priceData.priceAvg200).toLocaleString()} (${Number(price) > priceData.priceAvg200 ? 'ABOVE — long-term bullish' : 'BELOW — long-term bearish'})`);
  if (priceData.volume)      marketData.push(`24h Volume: $${(priceData.volume / 1e9).toFixed(2)}B`);
  if (priceData.dayHigh && priceData.dayLow) marketData.push(`Today's Range: $${Number(priceData.dayLow).toLocaleString()} – $${Number(priceData.dayHigh).toLocaleString()}`);

  const PAKISTAN_CONTEXT = `Pakistan investor context: PKR/USD ~278. Crypto is unregulated but accessible via P2P on Binance. Many Pakistanis use crypto as a USD hedge against PKR depreciation. High inflation history makes store-of-value assets appealing.`;

  let prompt;
  if (question) {
    prompt = `You are a crypto analyst. A Pakistani investor asks about ${sym}: "${question}"

LIVE MARKET DATA (source: ${priceData.source}):
Price: $${price} (${change}% today)
${marketData.join('\n')}

${PAKISTAN_CONTEXT}

Answer in 3-4 sentences. Reference the live data. Explain relevance for Pakistani investors. No financial advice.`;
  } else {
    prompt = `You are a crypto analyst for Wall-Trade — Pakistan's AI markets intelligence platform.

LIVE MARKET DATA FOR ${sym} (source: ${priceData.source}):
Price: $${price} (${change}% today)
${marketData.length ? marketData.join('\n') : 'Basic price data only'}

${PAKISTAN_CONTEXT}

Return ONLY valid JSON (no markdown, no backticks):
{
  "verdict": "Bullish" or "Neutral" or "Bearish",
  "score": <1-10>,
  "headline": "Sharp one-line take referencing actual data — max 12 words",
  "body": "2-3 sentences. Price momentum, key driver, Pakistan angle. No advice.",
  "insights": [
    {"icon":"📊","value":"metric+number","label":"max 8 words","color":"green"},
    {"icon":"⚡","value":"metric+number","label":"max 8 words","color":"amber"},
    {"icon":"🌍","value":"metric+number","label":"max 8 words","color":"purple"}
  ],
  "signals": [
    {"label":"2-3 word signal","type":"green"},
    {"label":"2-3 word signal","type":"amber"}
  ],
  "education": "2 sentences. What is ${sym} and what drives its price. Plain English for new Pakistani investor."
}`;
  }

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'Concise crypto analyst for Pakistani retail investors. Return only valid JSON for verdicts, plain text for questions. Always reference specific numbers from the data provided.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    let response;
    if (question) {
      response = { answer: raw };
    } else {
      const m = raw.match(/\{[\s\S]*\}/);
      response = m ? JSON.parse(m[0]) : { error: 'Parse failed', raw };
    }

    // Attach price data for frontend
    response.priceData = { price, change, source: priceData.source };

    cache[cacheKey] = { data: response, ts: Date.now() };
    console.log(`${sym} verdict: ${response.verdict} ${response.score}/10 | Source: ${priceData.source}`);
    return { statusCode: 200, headers, body: JSON.stringify(response) };

  } catch(e) {
    console.error('Crypto analyze error:', e.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI unavailable' }) };
  }
};
