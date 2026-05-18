const https = require('https');

// ── PSX FUNDAMENTALS — Q3 FY26 ────────────────────────────────
const PSX_FUNDAMENTALS = {
  // ... (keep your entire PSX_FUNDAMENTALS object exactly as-is)
  OGDC: { /* same */ },
  PPL: { /* same */ },
  // ... all stocks unchanged
};

// ── SECTOR MAP (same) ─────────────────────────────────────────
const SECTOR_MAP = {
  // ... (keep exactly as-is)
};

// ── SECTOR-SPECIFIC PROMPT BUILDERS (same) ────────────────────
function buildSectorDataBlock(ticker, s) {
  // ... (keep exactly as-is)
}

// ── FETCH WITH PROPER TIMEOUT ─────────────────────────────────
function fetchJSON(url, headers) {
  headers = headers || {};
  return new Promise(function(resolve) {
    var req = https.get(url, {
      headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)' }, headers)
    }, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(body)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', function() { resolve(null); });
    // Properly timeout AND destroy the request
    req.setTimeout(4000, function() {
      req.destroy();
      resolve(null);
    });
  });
}

// ── RETRY HELPER ──────────────────────────────────────────────
async function retry(fn, maxRetries, baseDelay) {
  maxRetries = maxRetries || 2;
  baseDelay = baseDelay || 1500;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch(e) {
      if (attempt === maxRetries) throw e;
      var isRetryable = e.message && (
        e.message.includes('timeout') ||
        e.message.includes('429') ||
        e.message.includes('503') ||
        e.message.includes('500')
      );
      if (!isRetryable) throw e;
      var delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      console.log('Retry ' + (attempt + 1) + '/' + maxRetries + ' after ' + Math.round(delay) + 'ms');
      await new Promise(function(r) { setTimeout(r, delay); });
    }
  }
}

// ── GLM 5.1 DIRECT (PRIMARY — fast ~2-5s) ─────────────────────
function callGLMDirect(body, timeoutMs) {
  timeoutMs = timeoutMs || 25000;
  var apiKey = process.env.GLM_API_KEY;
  if (!apiKey) return Promise.reject(new Error('No GLM key'));

  var data = JSON.stringify(body);
  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: 'open.bigmodel.cn',
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(b);
          if (parsed.error) {
            reject(new Error('GLM API: ' + (parsed.error.message || JSON.stringify(parsed.error))));
            return;
          }
          resolve(parsed);
        } catch(e) { reject(new Error('GLM parse error: ' + b.slice(0, 200))); }
      });
    });
    req.setTimeout(timeoutMs, function() {
      req.destroy(new Error('GLM timeout after ' + timeoutMs + 'ms'));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── GEMINI DIRECT (FREE FALLBACK — ~2-4s) ─────────────────────
function callGeminiDirect(prompt, timeoutMs) {
  timeoutMs = timeoutMs || 20000;
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Promise.reject(new Error('No Gemini key'));

  var data = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 800, temperature: 0.3 }
  });

  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(b);
          var text = parsed.candidates &&
                     parsed.candidates[0] &&
                     parsed.candidates[0].content &&
                     parsed.candidates[0].content.parts &&
                     parsed.candidates[0].content.parts[0] &&
                     parsed.candidates[0].content.parts[0].text || '';
          resolve(text);
        } catch(e) { reject(new Error('Gemini parse error')); }
      });
    });
    req.setTimeout(timeoutMs, function() {
      req.destroy(new Error('Gemini timeout'));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── OPENROUTER (LAST RESORT) ──────────────────────────────────
function callOpenRouter(body, timeoutMs) {
  timeoutMs = timeoutMs || 25000;
  return new Promise(function(resolve, reject) {
    var data = JSON.stringify(body);
    var req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://walltrade.markets',
        'X-Title': 'Wall-Trade',
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(b)); } catch(e) { reject(e); }
      });
    });
    // FIXED: destroy the request, not just reject the promise
    req.setTimeout(timeoutMs, function() {
      req.destroy(new Error('OpenRouter timeout after ' + timeoutMs + 'ms'));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── ROBUST JSON PARSER ────────────────────────────────────────
function parseVerdictJSON(raw) {
  if (!raw) return null;
  raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(raw); } catch(e) {}

  var first = raw.indexOf('{');
  var last = raw.lastIndexOf('}');
  if (first !== -1 && last !== -1) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch(e) {}
  }
  return null;
}

// ── FETCH LIVE PRICE (same as before) ─────────────────────────
async function getPSXPrice(ticker) {
  try {
    var data = await fetchJSON('http://188.166.245.128:3000/timeseries/int/' + ticker);
    if (!data || !data.data || !data.data.length) return null;
    var latest = data.data[0];
    var price = parseFloat(latest[1]);
    if (!price || price <= 0) return null;
    var oldest = data.data[data.data.length - 1];
    var openPrice = parseFloat(oldest[1]);
    var changeAmt = price - openPrice;
    var changePct = openPrice > 0 ? (changeAmt / openPrice) * 100 : 0;
    return {
      price: price.toFixed(2),
      change: changePct.toFixed(2),
      changeAmt: changeAmt.toFixed(2),
      dir: changePct >= 0 ? 'up' : 'dn'
    };
  } catch(e) { return null; }
}

// ── CALCULATE LIVE RATIOS (fixed) ─────────────────────────────
function calculateLiveRatios(ticker, livePrice) {
  var s = PSX_FUNDAMENTALS[ticker];
  if (!s || !livePrice || livePrice <= 0) return {};
  var ratios = {};
  var eps = parseFloat(s.eps);
  var dps = parseFloat(s.dps);
  var bvps = parseFloat(s.bvps);

  // Only calculate if we have actual numeric data (not 'N/A')
  if (eps > 0 && !isNaN(eps)) {
    ratios.pe = (livePrice / eps).toFixed(1);
  }
  if (bvps > 0 && !isNaN(bvps)) {
    ratios.pb = (livePrice / bvps).toFixed(2);
  }
  if (dps > 0 && !isNaN(dps)) {
    ratios.divYield = ((dps / livePrice) * 100).toFixed(2) + '%';
  }
  return ratios;
}

// ── ASSEMBLE STOCK DATA (same) ────────────────────────────────
async function getStockData(ticker) {
  var fb = PSX_FUNDAMENTALS[ticker];
  if (!fb) return null;
  var livePrice = await getPSXPrice(ticker);

  var NAME_MAP = {
    OGDC:'Oil & Gas Dev Co', PPL:'Pakistan Petroleum',
    PSO:'Pakistan State Oil', MARI:'Mari Petroleum',
    APL:'Attock Petroleum', HASCOL:'Hascol Petroleum',
    HBL:'Habib Bank Ltd', MCB:'MCB Bank',
    UBL:'United Bank Ltd', NBP:'National Bank',
    ABL:'Allied Bank Ltd', BAFL:'Bank Al Falah',
    ENGROH:'Engro Holdings', FFC:'Fauji Fertiliser',
    EFERT:'Engro Fertilisers', LUCK:'Lucky Cement',
    MLCF:'Maple Leaf Cement', CHCC:'Cherat Cement', DGKC:'DG Khan Cement',
    MEBL:'Meezan Bank', FABL:'Faysal Bank', BAHL:'Bank Al Habib',
    AKBL:'Askari Bank', BOP:'Bank of Punjab', SNBL:'Soneri Bank',
    POL:'Pakistan Oilfields', SHEL:'Shell Pakistan',
    FATIMA:'Fatima Fertilizer', FFBL:'Fauji Fertilizer Bin Qasim',
    FCCL:'Fauji Cement', PIOC:'Pioneer Cement', KOHC:'Kohat Cement',
    ACPL:'Attock Cement', POWER:'Power Cement',
    HUBC:'Hub Power', KEL:'K-Electric', KAPCO:'Kot Addu Power',
    NPL:'Nishat Power', NCPL:'Nishat Chunian Power', PKGP:'Pakgen Power',
    SYS:'Systems Limited', TRG:'TRG Pakistan', PTC:'Pakistan Telecom',
    AIRLINK:'Air Link Communication', AVN:'Avanceon', NETSOL:'NetSol Technologies',
    INDU:'Indus Motor', HCAR:'Honda Atlas Cars', PSMC:'Pak Suzuki',
    GHNL:'Ghandhara Nissan', SAZEW:'Sazgar Engineering',
    MTL:'Millat Tractors', AGTL:'Al-Ghazi Tractors',
    NESTLE:'Nestle Pakistan', UNITY:'Unity Foods', NATF:'National Foods',
    MUREB:'Murree Brewery', COLG:'Colgate Palmolive',
    ILP:'Interloop', NML:'Nishat Mills', GATM:'Gul Ahmed Textile',
    KTML:'Kohinoor Textile', SAPT:'Sapphire Textile',
    DAWH:'Dawood Hercules', EPCL:'Engro Polymer',
    LOTCHEM:'LOTTE Chemical', SNGP:'Sui Northern Gas', SSGC:'Sui Southern Gas',
    EFUG:'EFU General', EFUL:'EFU Life', JGICL:'Jubilee General',
    SEARL:'Searle Company', AGP:'AGP Limited',
    GLAXO:'GlaxoSmithKline Pakistan', ABOT:'Abbott Laboratories',
    MUGHAL:'Mughal Iron & Steel', ASTL:'Amreli Steels',
    ISL:'International Steels', ASL:'Aisha Steel',
    PIBTL:'Pakistan Int. Bulk Terminal',
    PIAA:'PIA Holding', HUMNL:'Hum Network',
  };

  var SECTOR_LABEL = {
    ENERGY_EP:'Oil & Gas E&P', OMC:'Oil Marketing',
    BANKING:'Commercial Banking', FERTILISER:'Fertilizer', CEMENT:'Cement',
    POWER:'Power & Utilities', TECH:'Technology & Telecom',
    AUTO:'Auto & Engineering', CONSUMER:'Consumer & Food',
    TEXTILE:'Textile Exports', HOLDING:'Holding & Diversified',
    CHEMICALS:'Chemicals & Industrial', INSURANCE:'Insurance',
    PHARMA:'Pharmaceuticals', STEEL:'Steel & Materials',
    LOGISTICS:'Logistics & Ports', AVIATION:'Aviation', MEDIA:'Media',
  };

  var sectorCode = SECTOR_MAP[ticker] || 'GENERAL';

  return Object.assign({
    ticker: ticker,
    name: NAME_MAP[ticker] || ticker,
    sector: SECTOR_LABEL[sectorCode] || 'Pakistan Stock Exchange',
    sectorCode: sectorCode,
    price: livePrice ? livePrice.price : null,
    change: livePrice ? livePrice.change : null,
    changeAmt: livePrice ? livePrice.changeAmt : null,
    dir: livePrice ? livePrice.dir : 'up',
    dataSource: livePrice ? 'PSX Live' : 'fundamentals only',
  }, fb);
}

// ── SUPABASE HELPERS (same) ───────────────────────────────────
var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
var VERDICT_CACHE_TTL = 6 * 60 * 60 * 1000;

function supabase(path, method, body) {
  method = method || 'GET';
  body = body || null;
  return new Promise(function(resolve) {
    var data = body ? JSON.stringify(body) : null;
    var hostname = SUPABASE_URL.replace('https://', '');
    var headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation',
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    var req = https.request({
      hostname: hostname,
      path: '/rest/v1/' + path,
      method: method,
      headers: headers
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() { try { resolve(JSON.parse(b)); } catch(e) { resolve(null); } });
    });
    req.on('error', function() { resolve(null); });
    if (data) req.write(data);
    req.end();
  });
}

function supabaseRpc(fn, params) {
  return new Promise(function(resolve) {
    var data = JSON.stringify(params);
    var hostname = SUPABASE_URL.replace('https://', '');
    var req = https.request({
      hostname: hostname,
      path: '/rest/v1/rpc/' + fn,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      var b = '';
      res.on('data', function(c) { b += c; });
      res.on('end', function() { try { resolve(JSON.parse(b)); } catch(e) { resolve(null); } });
    });
    req.on('error', function() { resolve(null); });
    req.write(data);
    req.end();
  });
}

async function getLatestMacro() {
  try {
    var rows = await supabase('macro?select=content,updated_at&order=updated_at.desc&limit=1');
    if (!rows || !rows[0] || !rows[0].content) return null;
    return { content: rows[0].content, updated_at: rows[0].updated_at };
  } catch(e) { return null; }
}

async function getCachedVerdict(ticker) {
  try {
    var rows = await supabase('verdict_cache?ticker=eq.' + ticker + '&select=verdict,updated_at');
    if (!rows || !rows[0]) return null;
    var age = Date.now() - new Date(rows[0].updated_at).getTime();
    if (age > VERDICT_CACHE_TTL) return null;
    return rows[0].verdict;
  } catch(e) { return null; }
}

async function saveVerdictCache(ticker, verdict) {
  try {
    await supabase('verdict_cache?ticker=eq.' + ticker, 'PATCH', { verdict: verdict, updated_at: new Date().toISOString() });
  } catch(e) {
    try {
      await supabase('verdict_cache', 'POST', { ticker: ticker, verdict: verdict, updated_at: new Date().toISOString() });
    } catch(e2) {}
  }
}

function decodeJWT(token) {
  try {
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString()).sub || null;
  } catch(e) { return null; }
}

// ── GENERATE AI VERDICT — FIXED WITH CASCADE ──────────────────
async function generateVerdict(stockData, macroContext) {
  var sectorBlock = buildSectorDataBlock(stockData.ticker, stockData);

  var techBlock = '';
  if (stockData.technicals) {
    var t = stockData.technicals;
    var rsiRead = !t.rsi ? 'N/A'
      : t.rsi < 30 ? 'Oversold (' + t.rsi + ')'
      : t.rsi > 70 ? 'Overbought (' + t.rsi + ')'
      : 'Neutral (' + t.rsi + ')';
    var macdRead = t.macd
      ? (t.macd.histogram >= 0
          ? 'Positive histogram (+' + t.macd.histogram + ')'
          : 'Negative histogram (' + t.macd.histogram + ')')
      : 'N/A';
    var bbRead = t.bb
      ? (t.bb.percentB > 0.8 ? 'Near upper band'
        : t.bb.percentB < 0.2 ? 'Near lower band'
        : 'Mid-range')
      : 'N/A';
    var p = parseFloat(stockData.price);
    var maRead = (t.ma20 && t.ma50 && p)
      ? 'Price ' + (p > t.ma20 ? 'above' : 'below') + ' MA20 (PKR ' + t.ma20 + ') and '
        + (p > t.ma50 ? 'above' : 'below') + ' MA50 (PKR ' + t.ma50 + ')'
      : 'N/A';
    techBlock = '\n\nTECHNICAL INDICATORS (supporting context only):\n' +
      'RSI(14): ' + rsiRead + '\nMACD: ' + macdRead + '\nBollinger %B: ' + bbRead + '\nMA: ' + maRead;
  }

  var prompt = 'You are a sharp PSX equity analyst for Wall-Trade.\n\n' +
    'LIVE PRICE DATA:\n' +
    'Ticker: ' + stockData.ticker + ' - ' + stockData.name + '\n' +
    'Price: PKR ' + (stockData.price || '-') + ' (' + (stockData.change || '-') + '% today)\n\n' +
    sectorBlock + '\n\n' +
    'COMPANY ANALYSIS:\n' + (stockData.aiSummary || '') + '\n\n' +
    'PAKISTAN MACRO CONTEXT:\n' + macroContext +
    techBlock + '\n\n' +
    'INSTRUCTION: Sector-aware, data-driven analysis. Reference specific numbers.\n\n' +
    'Return ONLY this JSON (no markdown):\n' +
    '{\n' +
    '  "verdict": "Strong Fundamentals" | "Mixed Picture" | "Needs Monitoring",\n' +
    '  "score": <1-10>,\n' +
    '  "headline": "<sharp one-liner max 12 words with data>",\n' +
    '  "body": "<120-150 words with 2-3 data points and one risk>",\n' +
    '  "technicalRead": "<1 sentence on RSI/MACD/BB collective reading>",\n' +
    '  "insights": [\n' +
    '    {"icon":"<emoji>","value":"<metric>","label":"<10 words>","color":"green|amber|red|purple"},\n' +
    '    {"icon":"<emoji>","value":"<metric>","label":"<10 words>","color":"green|amber|red|purple"},\n' +
    '    {"icon":"<emoji>","value":"<metric>","label":"<10 words>","color":"green|amber|red|purple"}\n' +
    '  ],\n' +
    '  "signals": [\n' +
    '    {"label":"<2-4 words>","type":"green|amber|red|purple"},\n' +
    '    {"label":"<2-4 words>","type":"green|amber|red|purple"},\n' +
    '    {"label":"<2-4 words>","type":"green|amber|red|purple"}\n' +
    '  ],\n' +
    '  "scores": {"Financial health":<1-10>,"Macro environment":<1-10>,"Growth outlook":<1-10>,"Risk level":<1-10>},\n' +
    '  "factors": [\n' +
    '    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with numbers>"},\n' +
    '    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with numbers>"},\n' +
    '    {"icon":"<emoji>","title":"<factor>","detail":"<2-3 sentences with numbers>"}\n' +
    '  ],\n' +
    '  "summary": "<one sentence with key number>"\n' +
    '}';

  var systemPrompt = 'You are a senior equity analyst at a top Pakistani brokerage.\n\n' +
    'RULES:\n' +
    '- Cite exact figures — "38.4% net margin" not "strong margins"\n' +
    '- Every sentence specific to THIS stock\n' +
    '- Sector logic mandatory: BANKING=P/B primary. E&P=circular debt risk. OMC=1-3% margins normal. CEMENT=coal cost #1. FERTILIZER=dividend yield is the case.\n' +
    '- Body MUST be 120-150 words minimum\n' +
    '- Never give buy/sell advice\n' +
    '- Never mention analyst price targets\n' +
    '- If technicals unavailable, set technicalRead to empty string';

  var verdict = null;

  // ── ATTEMPT 1: GLM 5.1 Direct (fastest, ~2-5s) ──────────────
  if (!verdict && process.env.GLM_API_KEY) {
    try {
      var glmResult = await retry(function() {
        return callGLMDirect({
          model: 'glm-5.1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }, 25000);
      }, 2, 1500);

      var rawGLM = '';
      if (glmResult && glmResult.choices && glmResult.choices[0] && glmResult.choices[0].message) {
        rawGLM = glmResult.choices[0].message.content || '';
      }
      verdict = parseVerdictJSON(rawGLM);
      if (verdict) console.log('GLM 5.1 succeeded for ' + stockData.ticker);
    } catch(e) {
      console.log('GLM 5.1 failed: ' + e.message);
    }
  }

  // ── ATTEMPT 2: Gemini Direct (free, ~2-4s) ──────────────────
  if (!verdict && process.env.GEMINI_API_KEY) {
    try {
      var geminiPrompt = systemPrompt + '\n\n' + prompt + '\n\nRespond in valid JSON only.';
      var rawGemini = await retry(function() {
        return callGeminiDirect(geminiPrompt, 20000);
      }, 1, 1000);
      verdict = parseVerdictJSON(rawGemini);
      if (verdict) console.log('Gemini succeeded for ' + stockData.ticker);
    } catch(e) {
      console.log('Gemini failed: ' + e.message);
    }
  }

  // ── ATTEMPT 3: OpenRouter Gemini Flash (last resort, ~3-8s) ─
  if (!verdict && process.env.OPENROUTER_API_KEY) {
    try {
      var orResult = await retry(function() {
        return callOpenRouter({
          model: 'google/gemini-2.0-flash-001',
          max_tokens: 800,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        }, 25000);
      }, 1, 1500);

      var rawOR = '';
      if (orResult && orResult.choices && orResult.choices[0] && orResult.choices[0].message) {
        rawOR = orResult.choices[0].message.content || '';
      }
      verdict = parseVerdictJSON(rawOR);
      if (verdict) console.log('OpenRouter succeeded for ' + stockData.ticker);
    } catch(e) {
      console.log('OpenRouter failed: ' + e.message);
    }
  }

  return verdict;
}

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: headers, body: '' };

  var payload;
  try { payload = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  var ticker = payload.ticker;
  var macroContext = payload.macroContext;
  var priceOnly = payload.priceOnly;
  var token = payload.token;
  var technicals = payload.technicals || null;

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  var cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  var stockData, cachedVerdict;
  try {
    var results = await Promise.all([
      getStockData(cleanTicker),
      getCachedVerdict(cleanTicker)
    ]);
    stockData = results[0];
    cachedVerdict = results[1];
  } catch(e) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Data fetch failed' }) };
  }

  if (!stockData) {
    return { statusCode: 404, headers: headers, body: JSON.stringify({ error: 'No data for ' + cleanTicker }) };
  }

  var liveRatios = calculateLiveRatios(cleanTicker, parseFloat(stockData.price) || 0);
  var stockDataWithRatios = Object.assign({}, stockData, liveRatios);
  if (technicals) stockDataWithRatios.technicals = technicals;

  if (priceOnly) {
    return { statusCode: 200, headers: headers, body: JSON.stringify({ stockData: stockDataWithRatios, verdict: null }) };
  }

  var userId = token ? decodeJWT(token) : null;
  if (!userId) {
    return { statusCode: 401, headers: headers, body: JSON.stringify({ error: 'Please sign in to generate verdicts.' }) };
  }

  if (cachedVerdict) {
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ stockData: stockDataWithRatios, verdict: cachedVerdict, cached: true })
    };
  }

  var usageCheck, latestMacro;
  try {
    var results2 = await Promise.all([
      supabaseRpc('check_and_increment_usage', { p_user_id: userId, p_type: 'verdict' }),
      getLatestMacro()
    ]);
    usageCheck = results2[0];
    latestMacro = results2[1];
  } catch(e) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Rate limit check failed' }) };
  }

  if (!usageCheck || !usageCheck.allowed) {
    var tier = (usageCheck && usageCheck.tier) || 'free';
    var limit = (usageCheck && usageCheck.limit) || 5;
    var isPremium = tier === 'premium';
    return {
      statusCode: 429,
      headers: headers,
      body: JSON.stringify({
        error: 'Daily limit reached. ' + (isPremium ? 'Premium: ' + limit + '/day.' : 'Beta: ' + limit + '/day. Upgrade for 15/day.'),
        tier: tier, limit: limit, upgrade: !isPremium
      })
    };
  }

  var finalMacro = (latestMacro && latestMacro.content)
    ? latestMacro.content + '\n\nMacro last updated: ' + latestMacro.updated_at
    : (macroContext && macroContext.length > 50 ? macroContext : 'Pakistan macro context unavailable.');

  var verdict = await generateVerdict(stockDataWithRatios, finalMacro);

  // FIXED: Handle null verdict properly
  if (verdict) {
    await saveVerdictCache(cleanTicker, verdict);
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ stockData: stockDataWithRatios, verdict: verdict, cached: false })
    };
  } else {
    return {
      statusCode: 503,
      headers: headers,
      body: JSON.stringify({
        error: 'AI analysis temporarily unavailable. Please try again in 30 seconds.',
        stockData: stockDataWithRatios
      })
    };
  }
};
