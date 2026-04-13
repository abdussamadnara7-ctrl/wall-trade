// ── WALL-TRADE FOREX FUNCTION ─────────────────────────────────
// Uses the EXACT same FMP stable/quote pattern that works in prices.js
// Proven working: USDPKR, GBPUSD, EURUSD, USDSAR, USDAED, USDCNY
// Env var: FMP_API_KEY

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
// All symbols confirmed available in FMP stable/quote endpoint
// Cross-rates (e.g. PKR/GBP) are calculated from USDPKR + the USD pair
const FX_PAIRS = [
  {
    key: 'PKR/USD',
    fmpSymbol: 'USDPKR',      // FMP has this — confirmed working in prices.js
    base: 'USD', flag: '🇺🇸',
    label: 'US Dollar',
    isDirectPKR: true,         // FMP gives PKR per USD directly
    context: 'Primary benchmark. SBP managed float. Drives all import costs, CPI inflation, and dollar-linked stock revenues (OGDC, PPL, MARI).'
  },
  {
    key: 'PKR/SAR',
    fmpSymbol: 'USDSAR',      // FMP has USDSAR (SAR per USD)
    base: 'SAR', flag: '🇸🇦',
    label: 'Saudi Riyal',
    isDirectPKR: false,        // cross: USDPKR / USDSAR
    context: 'Largest remittance corridor — ~3.5M Pakistanis in KSA. SAR is pegged to USD at 3.75.'
  },
  {
    key: 'PKR/AED',
    fmpSymbol: 'USDAED',      // FMP has USDAED (AED per USD)
    base: 'AED', flag: '🇦🇪',
    label: 'UAE Dirham',
    isDirectPKR: false,        // cross: USDPKR / USDAED
    context: 'Second-largest remittance source. AED pegged to USD at 3.672. Large Pakistani diaspora in Dubai.'
  },
  {
    key: 'PKR/GBP',
    fmpSymbol: 'GBPUSD',      // FMP has GBPUSD (USD per GBP)
    base: 'GBP', flag: '🇬🇧',
    label: 'British Pound',
    isDirectPKR: false,        // cross: USDPKR × GBPUSD
    context: 'UK-Pakistan diaspora remittances. GBP moves with Bank of England policy decisions.'
  },
  {
    key: 'PKR/EUR',
    fmpSymbol: 'EURUSD',      // FMP has EURUSD (USD per EUR)
    base: 'EUR', flag: '🇪🇺',
    label: 'Euro',
    isDirectPKR: false,        // cross: USDPKR × EURUSD
    context: 'EU is a key trade partner. Pakistani textile exports partially invoiced in EUR.'
  },
  {
    key: 'PKR/CNY',
    fmpSymbol: 'USDCNY',      // FMP has USDCNY (CNY per USD)
    base: 'CNY', flag: '🇨🇳',
    label: 'Chinese Yuan',
    isDirectPKR: false,        // cross: USDPKR / USDCNY
    context: 'CPEC & bilateral trade. China is Pakistan\'s largest trading partner.'
  },
];

// ── FETCH ALL RATES ───────────────────────────────────────────
async function getAllFxRates(key) {
  // Fetch all FMP symbols in one batch call — same pattern as prices.js
  const symbols = FX_PAIRS.map(p => p.fmpSymbol).join(',');
  const data = await fetchJSON(
    `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${key}`
  );

  if (!Array.isArray(data) || !data.length) {
    console.error('FMP forex: no data returned for symbols:', symbols);
    return null;
  }

  // Index by symbol for easy lookup
  const bySymbol = {};
  data.forEach(q => { if (q.symbol && q.price) bySymbol[q.symbol] = q; });

  console.log('FMP forex symbols returned:', Object.keys(bySymbol).join(', '));

  // Get USDPKR — this is the anchor for all cross rates
  const usdpkrQuote = bySymbol['USDPKR'];
  if (!usdpkrQuote) {
    console.error('FMP forex: USDPKR not returned');
    return null;
  }
  const usdpkr = parseFloat(usdpkrQuote.price);

  const results = {};

  FX_PAIRS.forEach(cfg => {
    const q = bySymbol[cfg.fmpSymbol];
    if (!q?.price) {
      // For SAR and AED use hardcoded pegs as final fallback
      if (cfg.base === 'SAR') {
        const rate = usdpkr / 3.7500;
        results[cfg.key] = buildResult(cfg, rate, null, null, 'hardcoded peg');
      } else if (cfg.base === 'AED') {
        const rate = usdpkr / 3.6725;
        results[cfg.key] = buildResult(cfg, rate, null, null, 'hardcoded peg');
      }
      // Others: skip if FMP didn't return them
      return;
    }

    const fmpPrice = parseFloat(q.price);
    const fmpChange = q.changesPercentage != null ? parseFloat(q.changesPercentage) : null;
    let pkrRate;

    if (cfg.isDirectPKR) {
      // USDPKR: FMP gives "PKR per 1 USD" directly
      pkrRate = fmpPrice;
    } else if (['GBPUSD','EURUSD'].includes(cfg.fmpSymbol)) {
      // "USD per 1 foreign" → PKR per foreign = usdpkr × fmpPrice
      pkrRate = usdpkr * fmpPrice;
    } else {
      // USDSAR, USDAED, USDCNY: "foreign per 1 USD" → PKR per foreign = usdpkr / fmpPrice
      pkrRate = usdpkr / fmpPrice;
    }

    results[cfg.key] = buildResult(cfg, pkrRate, fmpChange, q, 'FMP');
  });

  // Return in defined order
  const ordered = {};
  FX_PAIRS.forEach(cfg => { if (results[cfg.key]) ordered[cfg.key] = results[cfg.key]; });
  return Object.keys(ordered).length ? ordered : null;
}

function buildResult(cfg, pkrRate, change, quote, source) {
  return {
    key:       cfg.key,
    flag:      cfg.flag,
    base:      cfg.base,
    label:     cfg.label,
    context:   cfg.context,
    rate:      pkrRate.toFixed(4),
    rateRound: pkrRate.toFixed(2),
    change:    change != null ? change.toFixed(2) : null,
    dir:       change != null ? (change >= 0 ? 'up' : 'dn') : null,
    display:   `1 ${cfg.base} = PKR ${pkrRate.toFixed(2)}`,
    source
  };
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
        body: JSON.stringify({ error: 'FX data unavailable. Please try again in a moment.' })
      };
    }
    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        rates,
        pairs:     FX_PAIRS.map(p => p.key),
        sbpNote:   'Interbank mid-market rates. Open market rates in Pakistan may differ by PKR 1–3.',
        source:    'Financial Modeling Prep (FMP)',
        timestamp: new Date().toISOString()
      })
    };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid action. Use: rates' }) };
};
