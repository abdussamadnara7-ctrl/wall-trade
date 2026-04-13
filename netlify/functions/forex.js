// ── WALL-TRADE FOREX FUNCTION ─────────────────────────────────
// Strategy: get USDPKR from ExchangeRate-API (reliable, free)
//           get major pairs (GBPUSD, EURUSD etc.) from FMP (paid)
//           calculate all PKR crosses from those two sources
// This is the correct architecture — PKR crosses aren't in FMP directly

const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 7000);
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

// ── FX PAIR CONFIG ────────────────────────────────────────────
// fmpSymbol = FMP symbol for USD vs this currency (always exists in FMP)
// For USD itself, fmpSymbol is null (rate = 1 by definition)
const FX_CONFIG = [
  {
    key: 'PKR/USD',
    fmpSymbol: null,          // USDPKR comes directly from ExchangeRate-API
    base: 'USD', flag: '🇺🇸',
    label: 'US Dollar',
    context: 'Primary benchmark. SBP managed float. Drives import costs, CPI inflation, and all dollar-denominated stock revenues (OGDC, PPL, MARI).'
  },
  {
    key: 'PKR/SAR',
    fmpSymbol: 'USDSAR',     // SAR is pegged to USD at ~3.75 — FMP has USDSAR
    base: 'SAR', flag: '🇸🇦',
    label: 'Saudi Riyal',
    context: 'Largest remittance corridor — ~3.5M Pakistanis in KSA send billions home monthly. SAR pegged to USD at 3.75.'
  },
  {
    key: 'PKR/AED',
    fmpSymbol: 'USDAED',     // AED pegged to USD at ~3.67 — FMP has USDAED
    base: 'AED', flag: '🇦🇪',
    label: 'UAE Dirham',
    context: 'Second-largest remittance source. AED pegged to USD at 3.672. Large Pakistani business and diaspora in Dubai.'
  },
  {
    key: 'PKR/GBP',
    fmpSymbol: 'GBPUSD',     // GBPUSD = how many USD per 1 GBP — FMP has this
    base: 'GBP', flag: '🇬🇧',
    label: 'British Pound',
    context: 'UK-Pakistan diaspora remittances. GBP moves with Bank of England policy decisions.'
  },
  {
    key: 'PKR/EUR',
    fmpSymbol: 'EURUSD',     // EURUSD = how many USD per 1 EUR — FMP has this
    base: 'EUR', flag: '🇪🇺',
    label: 'Euro',
    context: 'EU is a major trade partner. Pakistani textile exports partially invoiced in EUR.'
  },
  {
    key: 'PKR/CNY',
    fmpSymbol: 'USDCNY',     // USDCNY = how many CNY per 1 USD — FMP has this
    base: 'CNY', flag: '🇨🇳',
    label: 'Chinese Yuan',
    context: 'CPEC & bilateral trade. China is Pakistan\'s largest trading partner. CNY moves increase CPEC debt costs in PKR.'
  },
];

// ── FETCH USDPKR FROM EXCHANGERATE-API (free, always reliable) ──
async function getUSDPKR() {
  try {
    const data = await fetchJSON('https://open.er-api.com/v6/latest/USD');
    if (data?.rates?.PKR) return parseFloat(data.rates.PKR);
  } catch(e) {}
  return null;
}

// ── FETCH MAJOR FX PAIRS FROM FMP ────────────────────────────
async function getMajorPairs(key) {
  // Collect all FMP symbols we need (excluding null/USD)
  const symbols = FX_CONFIG
    .filter(f => f.fmpSymbol)
    .map(f => f.fmpSymbol)
    .join(',');

  try {
    const data = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${key}`
    );
    if (!Array.isArray(data)) return {};

    const result = {};
    data.forEach(q => {
      if (q.symbol && q.price) result[q.symbol] = q.price;
    });
    return result;
  } catch(e) {
    return {};
  }
}

// ── CALCULATE PKR CROSS RATE ──────────────────────────────────
// usdpkr    = how many PKR per 1 USD           e.g. 278.5
// fmpPrice  = FMP quote for fmpSymbol
// fmpSymbol = e.g. 'GBPUSD', 'USDSAR', 'USDCNY'
// base      = the foreign currency e.g. 'GBP', 'SAR', 'CNY'
//
// For GBPUSD (= USD per GBP):  PKR per GBP = usdpkr × GBPUSD
// For USDSAR (= SAR per USD):  PKR per SAR = usdpkr / USDSAR
// For USDAED (= AED per USD):  PKR per AED = usdpkr / USDAED
// For EURUSD (= USD per EUR):  PKR per EUR = usdpkr × EURUSD
// For USDCNY (= CNY per USD):  PKR per CNY = usdpkr / USDCNY

function calcPKRCross(usdpkr, fmpSymbol, fmpPrice) {
  if (!usdpkr || !fmpPrice) return null;
  const p = parseFloat(fmpPrice);
  if (!p || isNaN(p)) return null;

  // Symbols where FMP gives "USD per 1 foreign" (multiply by usdpkr)
  const usdPerForeign = ['GBPUSD', 'EURUSD', 'AUDUSD', 'NZDUSD'];
  // Symbols where FMP gives "foreign per 1 USD" (divide into usdpkr)
  const foreignPerUsd = ['USDSAR', 'USDAED', 'USDCNY', 'USDJPY', 'USDCHF'];

  if (usdPerForeign.includes(fmpSymbol)) {
    return usdpkr * p;        // e.g. PKR/GBP = 278.5 × 1.27 = 353.7
  } else if (foreignPerUsd.includes(fmpSymbol)) {
    return usdpkr / p;        // e.g. PKR/SAR = 278.5 / 3.75 = 74.3
  }
  return null;
}

// ── BUILD ALL 6 RATES ─────────────────────────────────────────
async function getAllFxRates(key) {
  // Fetch both sources in parallel
  const [usdpkr, majorPairs] = await Promise.all([
    getUSDPKR(),
    getMajorPairs(key)
  ]);

  if (!usdpkr) return null; // Can't proceed without USDPKR

  const results = {};

  FX_CONFIG.forEach(cfg => {
    let pkrRate = null;

    if (cfg.base === 'USD') {
      // USDPKR direct
      pkrRate = usdpkr;
    } else if (cfg.fmpSymbol) {
      // Calculate cross rate from USDPKR + FMP major pair
      const fmpPrice = majorPairs[cfg.fmpSymbol];

      if (fmpPrice) {
        pkrRate = calcPKRCross(usdpkr, cfg.fmpSymbol, fmpPrice);
      } else {
        // FMP didn't return this pair — use hardcoded pegs for SAR/AED
        // (these are fixed pegs, so hardcoding is accurate)
        if (cfg.base === 'SAR') pkrRate = usdpkr / 3.7500; // SAR fixed peg
        if (cfg.base === 'AED') pkrRate = usdpkr / 3.6725; // AED fixed peg
      }
    }

    if (pkrRate && pkrRate > 0) {
      results[cfg.key] = {
        key:       cfg.key,
        flag:      cfg.flag,
        base:      cfg.base,
        label:     cfg.label,
        context:   cfg.context,
        rate:      pkrRate.toFixed(4),
        rateRound: pkrRate.toFixed(2),
        display:   `1 ${cfg.base} = PKR ${pkrRate.toFixed(2)}`,
        source:    cfg.base === 'USD' ? 'ExchangeRate-API'
                 : cfg.fmpSymbol && majorPairs[cfg.fmpSymbol] ? 'FMP × ExchangeRate-API'
                 : 'Fixed peg × ExchangeRate-API'
      };
    }
  });

  // Return in consistent order
  const ordered = {};
  FX_CONFIG.forEach(cfg => {
    if (results[cfg.key]) ordered[cfg.key] = results[cfg.key];
  });

  return Object.keys(ordered).length >= 1 ? ordered : null;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const key = process.env.FMP_API_KEY;
  if (!key) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'FMP API key not configured' }) };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) {}

  if (!payload.action || payload.action === 'rates') {
    const rates = await getAllFxRates(key);

    if (!rates) {
      return {
        statusCode: 503, headers: CORS,
        body: JSON.stringify({ error: 'Could not fetch PKR rate. Please try again in a moment.' })
      };
    }

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        rates,
        pairs:   FX_CONFIG.map(f => f.key),
        sbpNote: 'Interbank mid-market rates. Open market rates in Pakistan may differ by PKR 1–3.',
        sources: 'PKR base rate: ExchangeRate-API · Major pairs: FMP',
        timestamp: new Date().toISOString()
      })
    };
  }

  return {
    statusCode: 400, headers: CORS,
    body: JSON.stringify({ error: 'Invalid action. Use: rates' })
  };
};
