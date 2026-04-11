// ── WALL-TRADE FOREX FUNCTION ─────────────────────────────────
// Strategy:
//  1. Fetch USDPKR, GBPUSD, EURUSD, USDCNY from FMP (these exist on Starter)
//  2. SAR & AED are USD-pegged (fixed rates) — compute from USDPKR
//  3. Construct all 6 PKR cross-rates with correct arithmetic
//  4. Fallback to open.er-api.com if FMP fails completely
//
// BUG HISTORY (fixed):
//  - app.html uses fx.pair but old code returned fx.key → now returns fx.pair
//  - Cross-rate math was inverted: pkrPerForeign = usdpkr / usdPerForeign (not multiply)
//  - USDGBP was fetched when GBPUSD was needed → now fetches correct symbols

const https = require('https');

function get(url, ms = 7000) {
  return new Promise(resolve => {
    const t = setTimeout(() => { console.log(`FX TIMEOUT: ${url.slice(0,60)}`); resolve(null); }, ms);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0', 'Accept': 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(t);
        console.log(`FX ${url.slice(0,60)} → HTTP ${res.statusCode}, len ${body.length}`);
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    }).on('error', e => { clearTimeout(t); console.log('FX ERR:', e.message); resolve(null); });
  });
}

// ── FX PAIR METADATA ─────────────────────────────────────────
// pair = display name shown in app.html (fx.pair)
const FX_PAIRS = [
  {
    pair: 'USD/PKR', flag: '🇺🇸🇵🇰', base: 'USD', label: 'US Dollar',
    context: 'The primary benchmark. SBP manages a controlled float against the dollar. Drives import costs, CPI inflation, and all dollar-linked stock revenues (OGDC, PPL, MARI).'
  },
  {
    pair: 'SAR/PKR', flag: '🇸🇦🇵🇰', base: 'SAR', label: 'Saudi Riyal',
    context: 'Largest remittance corridor — ~3.5M Pakistanis work in Saudi Arabia. SAR is pegged to USD at 3.75, so it effectively tracks PKR/USD movements.'
  },
  {
    pair: 'AED/PKR', flag: '🇦🇪🇵🇰', base: 'AED', label: 'UAE Dirham',
    context: 'Second-largest remittance source. AED is pegged to USD at 3.672. Large Pakistani business and professional community in Dubai and Abu Dhabi.'
  },
  {
    pair: 'GBP/PKR', flag: '🇬🇧🇵🇰', base: 'GBP', label: 'British Pound',
    context: 'UK hosts one of the largest Pakistani diaspora communities. GBP fluctuates with Bank of England policy. Strengthens when UK economy outperforms.'
  },
  {
    pair: 'EUR/PKR', flag: '🇪🇺🇵🇰', base: 'EUR', label: 'Euro',
    context: 'EU is a major trade partner. Pakistani textile and leather exports are partly invoiced in EUR. ECB rate decisions drive EUR strength or weakness.'
  },
  {
    pair: 'CNY/PKR', flag: '🇨🇳🇵🇰', base: 'CNY', label: 'Chinese Yuan',
    context: 'CPEC debt and bilateral trade. China is Pakistan\'s largest import source. A stronger CNY increases CPEC loan repayment costs in PKR terms.'
  },
];

// ── FETCH RATES VIA FMP ───────────────────────────────────────
// FMP Starter has: USDPKR, GBPUSD, EURUSD, USDCNY (USD base pairs)
// We do NOT fetch SARPKR/AEDPKR directly — they rarely exist in FMP
async function fetchFmpRates(apiKey) {
  // Fetch: USDPKR (PKR per 1 USD), GBPUSD (USD per 1 GBP), EURUSD (USD per 1 EUR), USDCNY (CNY per 1 USD)
  const symbols = 'USDPKR,GBPUSD,EURUSD,USDCNY';
  const data = await get(
    `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${apiKey}`
  );

  if (!Array.isArray(data) || data.length === 0) return null;

  const bySymbol = {};
  data.forEach(q => {
    if (q.symbol && q.price) bySymbol[q.symbol] = q;
  });

  const usdpkrQ = bySymbol['USDPKR'];
  if (!usdpkrQ?.price) return null; // Can't build anything without USDPKR

  const usdPkr  = parseFloat(usdpkrQ.price);    // e.g. 278.5  (1 USD = 278.5 PKR)
  const gbpUsd  = bySymbol['GBPUSD']?.price ? parseFloat(bySymbol['GBPUSD'].price) : null;  // e.g. 1.27 (1 GBP = 1.27 USD)
  const eurUsd  = bySymbol['EURUSD']?.price ? parseFloat(bySymbol['EURUSD'].price) : null;  // e.g. 1.08
  const usdCny  = bySymbol['USDCNY']?.price ? parseFloat(bySymbol['USDCNY'].price) : null;  // e.g. 7.23 (1 USD = 7.23 CNY)

  // ── CROSS-RATE ARITHMETIC ─────────────────────────────────
  // PKR per 1 foreign unit:
  //   USD:  usdPkr                    (direct)
  //   SAR:  usdPkr / 3.75            (SAR pegged: 1 USD = 3.75 SAR → 1 SAR = usdPkr/3.75)
  //   AED:  usdPkr / 3.672           (AED pegged: 1 USD = 3.672 AED)
  //   GBP:  usdPkr * gbpUsd          (1 GBP = gbpUsd USD → 1 GBP = usdPkr * gbpUsd PKR)
  //   EUR:  usdPkr * eurUsd          (same logic)
  //   CNY:  usdPkr / usdCny          (1 USD = usdCny CNY → 1 CNY = usdPkr/usdCny PKR)

  const usdChg = usdpkrQ.changesPercentage != null ? parseFloat(usdpkrQ.changesPercentage) : null;

  const rateMap = {
    'USD/PKR': { rate: usdPkr,                    chg: usdChg, source: 'FMP live' },
    'SAR/PKR': { rate: usdPkr / 3.75,             chg: usdChg, source: 'FMP cross (SAR peg)' },
    'AED/PKR': { rate: usdPkr / 3.672,            chg: usdChg, source: 'FMP cross (AED peg)' },
    'GBP/PKR': gbpUsd  ? { rate: usdPkr * gbpUsd,  chg: bySymbol['GBPUSD']?.changesPercentage != null ? parseFloat(bySymbol['GBPUSD'].changesPercentage) : null, source: 'FMP cross' } : null,
    'EUR/PKR': eurUsd  ? { rate: usdPkr * eurUsd,  chg: bySymbol['EURUSD']?.changesPercentage != null ? parseFloat(bySymbol['EURUSD'].changesPercentage) : null, source: 'FMP cross' } : null,
    'CNY/PKR': usdCny  ? { rate: usdPkr / usdCny,  chg: null, source: 'FMP cross' } : null,
  };

  console.log(`FX rates computed: USD=${usdPkr.toFixed(2)} SAR=${(usdPkr/3.75).toFixed(2)} GBP=${gbpUsd?(usdPkr*gbpUsd).toFixed(2):'?'}`);
  return rateMap;
}

// ── FALLBACK: ExchangeRate-API (free, no key needed) ──────────
async function fetchFallbackRates() {
  const data = await get('https://open.er-api.com/v6/latest/USD', 6000);
  if (!data?.rates?.PKR) return null;

  const usdPkr = parseFloat(data.rates.PKR);
  const gbpUsd = data.rates.GBP ? 1 / parseFloat(data.rates.GBP) : null; // er-api gives USD per GBP inverted
  const eurUsd = data.rates.EUR ? 1 / parseFloat(data.rates.EUR) : null;
  const usdCny = data.rates.CNY ? parseFloat(data.rates.CNY) : null;

  // er-api rates are units per USD, so rates.GBP = GBP per 1 USD (e.g. 0.787)
  // So: 1 GBP = 1/0.787 USD = 1.27 USD → pkrPerGbp = usdPkr * (1/rates.GBP)
  const gbpRate = data.rates.GBP ? usdPkr / parseFloat(data.rates.GBP) : null;
  const eurRate = data.rates.EUR ? usdPkr / parseFloat(data.rates.EUR) : null;
  const cnyRate = data.rates.CNY ? usdPkr / parseFloat(data.rates.CNY) : null;

  console.log(`FX fallback (er-api): USD=${usdPkr.toFixed(2)}`);

  return {
    'USD/PKR': { rate: usdPkr,           chg: null, source: 'er-api fallback' },
    'SAR/PKR': { rate: usdPkr / 3.75,    chg: null, source: 'er-api cross (SAR peg)' },
    'AED/PKR': { rate: usdPkr / 3.672,   chg: null, source: 'er-api cross (AED peg)' },
    'GBP/PKR': gbpRate ? { rate: gbpRate, chg: null, source: 'er-api cross' } : null,
    'EUR/PKR': eurRate ? { rate: eurRate, chg: null, source: 'er-api cross' } : null,
    'CNY/PKR': cnyRate ? { rate: cnyRate, chg: null, source: 'er-api cross' } : null,
  };
}

// ── BUILD FINAL RESPONSE OBJECT ───────────────────────────────
function buildRates(rateMap) {
  const results = {};

  FX_PAIRS.forEach(cfg => {
    const r = rateMap[cfg.pair];
    if (!r || !r.rate || isNaN(r.rate) || r.rate <= 0) return;

    const rateNum = parseFloat(r.rate);
    results[cfg.pair] = {
      pair:      cfg.pair,        // ← app.html uses fx.pair
      flag:      cfg.flag,
      base:      cfg.base,
      label:     cfg.label,
      context:   cfg.context,
      rate:      rateNum.toFixed(4),
      rateRound: rateNum.toFixed(2),
      change:    r.chg != null ? parseFloat(r.chg).toFixed(2) : null,
      dir:       r.chg != null ? (parseFloat(r.chg) >= 0 ? 'up' : 'dn') : null,
      display:   `1 ${cfg.base} = PKR ${rateNum.toFixed(2)}`,
      source:    r.source
    };
  });

  return Object.keys(results).length >= 3 ? results : null;
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

  const apiKey = process.env.FMP_API_KEY;

  // Try FMP first, fall back to er-api
  let rateMap = null;

  if (apiKey) {
    rateMap = await fetchFmpRates(apiKey);
  }

  if (!rateMap) {
    console.log('FMP failed or no key — trying er-api fallback');
    rateMap = await fetchFallbackRates();
  }

  if (!rateMap) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'FX rates temporarily unavailable. Please try again in a moment.' })
    };
  }

  const rates = buildRates(rateMap);
  if (!rates) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'Could not compute FX rates. Please try again.' })
    };
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      rates,
      pairs:     Object.keys(rates),
      sbpNote:   'Interbank mid-market rates. Open market rates in Pakistan may differ by PKR 1–3. Check your bank for transaction rates.',
      source:    apiKey ? 'Financial Modeling Prep (FMP)' : 'ExchangeRate-API',
      timestamp: new Date().toISOString()
    })
  };
};
