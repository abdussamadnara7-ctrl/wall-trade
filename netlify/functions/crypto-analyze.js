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

function fetchFMP(path, timeoutMs = 4000) {
  const key = process.env.FMP_API_KEY;
  if (!key) return Promise.resolve(null);
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://financialmodelingprep.com/stable/${path}${sep}apikey=${key}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => { console.log('FMP timeout:', path.slice(0,40)); resolve(null); }, timeoutMs);
    https.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`FMP ${path.slice(0,40)} → ${res.statusCode}`);
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    }).on('error', (e) => { clearTimeout(timer); resolve(null); });
  });
}

// Cache
const cache = {};
const CACHE_TTL = 20 * 60 * 1000; // 20 mins

// Coin → FMP news symbol map
const COIN_NEWS_SYMBOL = {
  BTC: 'BTCUSD', ETH: 'ETHUSD', SOL: 'SOLUSD', BNB: 'BNBUSD',
  XRP: 'XRPUSD', ADA: 'ADAUSD', DOGE: 'DOGEUSD', DOT: 'DOTUSD',
  AVAX: 'AVAXUSD', MATIC: 'MATICUSD'
};

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
  let { price, change } = payload;
  if (!symbol) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) }; 

  const cacheKey = question ? `q_${symbol}_${question.slice(0,40)}` : `v_${symbol}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`Cache hit: ${symbol}`);
    return { statusCode: 200, headers, body: JSON.stringify(cached.data) };
  }

  const fmpSymbol = `${symbol}USD`;
  const newsSymbol = COIN_NEWS_SYMBOL[symbol] || fmpSymbol;

  // Fire all FMP calls in parallel — full quote + news + history
  const [quoteData, newsData, histData] = await Promise.all([
    fetchFMP(`quote?symbol=${fmpSymbol}`, 5000),
    fetchFMP(`news/crypto?symbols=${newsSymbol}&limit=5`, 4000),
    fetchFMP(`historical-price-eod/light?symbol=${fmpSymbol}`, 4000)
  ]);

  // Extract price — handle both changePercentage and changesPercentage field names
  const q = Array.isArray(quoteData) ? quoteData[0] : quoteData;
  if (q?.price && Number(q.price) > 0) {
    price = Number(q.price).toFixed(2);
    change = Number(q.changePercentage ?? q.changesPercentage ?? 0).toFixed(2);
    console.log(`${symbol} from full quote: $${price} (${change}%)`);
  } else if (!price || price === '0' || Number(price) === 0) {
    // Fallback: try quote-short
    console.log(`${symbol}: full quote empty (status may be 402 or empty array), trying quote-short...`);
    const short = await fetchFMP(`quote-short?symbol=${fmpSymbol}`, 4000);
    const sq = Array.isArray(short) ? short[0] : short;
    if (sq?.price && Number(sq.price) > 0) {
      price = Number(sq.price).toFixed(2);
      change = Number(sq.changesPercentage ?? 0).toFixed(2);
      console.log(`${symbol} from quote-short: $${price}`);
    } else {
      console.log(`${symbol}: both quote and quote-short failed — no price`);
    }
  }

  // Hard stop — no point calling Claude with no price
  if (!price || price === '0' || Number(price) === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({
      error: 'price_unavailable',
      message: `Live price for ${symbol} is temporarily unavailable. Please try again shortly.`
    })};
  }


  // Build rich market data context
  const marketData = [];
  if (q) {
    if (q.yearHigh)    marketData.push(`52W High: $${Number(q.yearHigh).toLocaleString()}`);
    if (q.yearLow)     marketData.push(`52W Low: $${Number(q.yearLow).toLocaleString()}`);
    if (q.marketCap)   marketData.push(`Market Cap: $${(q.marketCap/1e9).toFixed(1)}B`);
    if (q.priceAvg50)  marketData.push(`50-Day MA: $${Number(q.priceAvg50).toLocaleString()} (${Number(price) > q.priceAvg50 ? 'ABOVE — bullish' : 'BELOW — bearish'})`);
    if (q.priceAvg200) marketData.push(`200-Day MA: $${Number(q.priceAvg200).toLocaleString()} (${Number(price) > q.priceAvg200 ? 'ABOVE — long-term bullish' : 'BELOW — long-term bearish'})`);
    if (q.volume)      marketData.push(`24h Volume: $${(q.volume/1e9).toFixed(2)}B`);
    if (q.dayHigh && q.dayLow) marketData.push(`Today's Range: $${Number(q.dayLow).toLocaleString()} – $${Number(q.dayHigh).toLocaleString()}`);
  }

  // 30-day price change from history
  const hist = Array.isArray(histData) ? histData : histData?.historical;
  if (hist?.length >= 30) {
    const price30ago = hist[29]?.close || hist[hist.length-1]?.close;
    if (price30ago) {
      const change30d = ((Number(price) - price30ago) / price30ago * 100).toFixed(1);
      marketData.push(`30-Day Change: ${change30d > 0 ? '+' : ''}${change30d}%`);
    }
  }

  // Latest news headlines
  const newsHeadlines = [];
  if (Array.isArray(newsData) && newsData.length) {
    newsData.slice(0, 4).forEach(n => {
      if (n.title) newsHeadlines.push(`[${n.publisher}] ${n.title}`);
    });
  }

  const PAKISTAN_CONTEXT = `Pakistan investor context: PKR/USD ~278. Crypto is in a legal grey area — SBP hasn't banned it but it's unregulated. Many Pakistanis use crypto as a USD hedge against PKR depreciation and for cross-border remittances. P2P trading on Binance is most common access method. High inflation history makes Pakistani investors particularly interested in store-of-value assets.`;

  let prompt;
  if (question) {
    prompt = `You are a crypto analyst. A Pakistani investor asks about ${symbol}: "${question}"

LIVE MARKET DATA:
Price: $${price} (${change}% today)
${marketData.join('\n')}

${newsHeadlines.length ? `LATEST NEWS:\n${newsHeadlines.join('\n')}` : ''}

${PAKISTAN_CONTEXT}

Answer in 3-4 sentences. Reference the live data above. Explain what it means specifically for Pakistani investors. No financial advice.`;
  } else {
    prompt = `You are a crypto analyst for Wall-Trade — Pakistan's AI markets intelligence platform.

LIVE MARKET DATA FOR ${symbol}:
Price: $${price} (${change}% today)
${marketData.join('\n')}

${newsHeadlines.length ? `LATEST NEWS (last 24-48 hours):\n${newsHeadlines.join('\n')}\n\nFactor these developments into your analysis.` : ''}

${PAKISTAN_CONTEXT}

Return ONLY valid JSON (no markdown, no backticks):
{
  "verdict": "Bullish" or "Neutral" or "Bearish",
  "score": <1-10>,
  "headline": "Sharp one-line take referencing actual data — max 12 words",
  "body": "2-3 sentences. Price level vs MA, key news driver, Pakistan angle. No advice.",
  "insights": [
    {"icon":"📊","value":"metric+number","label":"max 8 words","color":"green"},
    {"icon":"⚡","value":"metric+number","label":"max 8 words","color":"amber"},
    {"icon":"🌍","value":"metric+number","label":"max 8 words","color":"purple"}
  ],
  "signals": [
    {"label":"2-3 word signal","type":"green"},
    {"label":"2-3 word signal","type":"amber"}
  ],
  "education": "2 sentences. What is ${symbol} and what drives its price. Plain English for new Pakistani investor."
}`;
  }

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'You are a concise crypto analyst with access to live market data. Return only valid JSON for verdicts, plain text for questions. Always reference specific numbers from the data provided.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    let response;
    if (question) {
      response = { answer: raw };
    } else {
      const m = raw.match(/\{[\s\S]*\}/);
      response = m ? JSON.parse(m[0]) : { error: 'Parse failed' };
    }

    // Attach market data for frontend use
    if (!question && q) {
      response.marketData = {
        yearHigh: q.yearHigh, yearLow: q.yearLow,
        marketCap: q.marketCap, priceAvg50: q.priceAvg50,
        priceAvg200: q.priceAvg200, volume: q.volume,
        dayHigh: q.dayHigh, dayLow: q.dayLow
      };
      if (hist?.length >= 7) response.history = hist.slice(0, 30).map(d => ({ date: d.date, close: d.close }));
    }

    cache[cacheKey] = { data: response, ts: Date.now() };
    console.log(`${symbol} verdict: ${response.verdict} ${response.score}/10 | News: ${newsHeadlines.length} | MarketData: ${marketData.length} fields`);
    return { statusCode: 200, headers, body: JSON.stringify(response) };

  } catch(e) {
    console.error('Crypto analyze error:', e.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI unavailable' }) };
  }
};
