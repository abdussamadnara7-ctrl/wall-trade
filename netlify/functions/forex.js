// ── WALL-TRADE FOREX FUNCTION ─────────────────────────────────
// All FX data via FMP (paid plan) — 1,500+ forex pairs, real-time
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

// ── 6 FX PAIRS — FMP symbols + metadata ──────────────────────
// FMP forex symbols: base currency + quote currency, e.g. USDPKR = USD per PKR
// We want PKR per foreign unit, so we use PKRUSD, PKRSAR etc. or invert USDPKR
const FX_CONFIG = [
  {
    key: 'PKR/USD', fmpSymbol: 'USDPKR', invertRate: false,
    flag: '🇵🇰🇺🇸', base: 'USD', label: 'US Dollar',
    display: '1 USD = PKR ?',
    context: 'Primary benchmark. SBP managed float. Drives import costs, CPI inflation, and all dollar-denominated stock revenues (OGDC, PPL, MARI).'
  },
  {
    key: 'PKR/SAR', fmpSymbol: 'SARPKR', invertRate: false,
    flag: '🇸🇦', base: 'SAR', label: 'Saudi Riyal',
    display: '1 SAR = PKR ?',
    context: 'Largest remittance corridor — ~3.5M Pakistanis in KSA. SAR is pegged to USD at 3.75, so it tracks PKR/USD closely.'
  },
  {
    key: 'PKR/AED', fmpSymbol: 'AEDPKR', invertRate: false,
    flag: '🇦🇪', base: 'AED', label: 'UAE Dirham',
    display: '1 AED = PKR ?',
    context: 'Second-largest remittance source. UAE Dirham pegged to USD at 3.67. Large Pakistani business community in Dubai.'
  },
  {
    key: 'PKR/GBP', fmpSymbol: 'GBPPKR', invertRate: false,
    flag: '🇬🇧', base: 'GBP', label: 'British Pound',
    display: '1 GBP = PKR ?',
    context: 'UK-Pakistan diaspora remittances. GBP moves with Bank of England policy. Strengthens when UK economy outperforms.'
  },
  {
    key: 'PKR/EUR', fmpSymbol: 'EURPKR', invertRate: false,
    flag: '🇪🇺', base: 'EUR', label: 'Euro',
    display: '1 EUR = PKR ?',
    context: 'EU is a major trade partner for Pakistan. Textile exports partially invoiced in EUR. ECB rate decisions impact EUR strength.'
  },
  {
    key: 'PKR/CNY', fmpSymbol: 'CNYPKR', invertRate: false,
    flag: '🇨🇳', base: 'CNY', label: 'Chinese Yuan',
    display: '1 CNY = PKR ?',
    context: 'CPEC & bilateral trade. China is Pakistan\'s largest trading partner. CNY appreciations increase CPEC debt servicing costs in PKR.'
  },
];

// ── FETCH ALL 6 RATES VIA FMP ─────────────────────────────────
async function getAllFxRates(key) {
  const symbols = FX_CONFIG.map(f => f.fmpSymbol).join(',');

  // Primary: FMP stable/quote endpoint (real-time)
  const data = await fetchJSON(
    `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${key}`
  );

  // Also try the fx endpoint for any gaps
  const fxData = await fetchJSON(
    `https://financialmodelingprep.com/api/v3/fx?apikey=${key}`
  );

  const fxBySymbol = {};
  if (Array.isArray(fxData)) {
    fxData.forEach(f => { fxBySymbol[f.ticker] = f; });
  }

  const results = {};

  FX_CONFIG.forEach(cfg => {
    // Try stable/quote first
    let rate = null;
    let change = null;
    let changeAmt = null;

    if (Array.isArray(data)) {
      const q = data.find(d => d.symbol === cfg.fmpSymbol);
      if (q?.price) {
        rate      = q.price;
        change    = q.changesPercentage;
        changeAmt = q.change;
      }
    }

    // Fallback: fx endpoint
    if (!rate && fxBySymbol[cfg.fmpSymbol]) {
      const f = fxBySymbol[cfg.fmpSymbol];
      rate   = f.bid || f.ask || f.open;
      change = null;
    }

    // If FMP doesn't have SARPKR/AEDPKR directly, construct from USDPKR and USDSAR/USDAED
    if (!rate) {
      // We'll handle cross-rate calculation below if needed
      rate = null;
    }

    if (rate) {
      const rateNum = parseFloat(rate);
      results[cfg.key] = {
        key:        cfg.key,
        flag:       cfg.flag,
        base:       cfg.base,
        label:      cfg.label,
        context:    cfg.context,
        rate:       rateNum.toFixed(4),
        rateRound:  rateNum.toFixed(2),
        change:     change != null ? parseFloat(change).toFixed(2) : null,
        changeAmt:  changeAmt != null ? parseFloat(changeAmt).toFixed(4) : null,
        dir:        change != null ? (parseFloat(change) >= 0 ? 'up' : 'dn') : null,
        display:    `1 ${cfg.base} = PKR ${rateNum.toFixed(2)}`,
        source:     'FMP'
      };
    }
  });

  // ── CROSS-RATE FALLBACK via USDPKR ───────────────────────────
  // If some pairs are missing (FMP may not have all PKR crosses),
  // construct them from USDPKR + USD/base pair
  const usdpkr = results['PKR/USD'] ? parseFloat(results['PKR/USD'].rate) : null;

  if (usdpkr) {
    const crossPairs = [
      { key: 'PKR/SAR', usdBase: 'USDSARR', fmpAlt: 'USDSAR', divisor: 3.75  }, // SAR pegged
      { key: 'PKR/AED', usdBase: 'USDAEDR', fmpAlt: 'USDAED', divisor: 3.672 }, // AED pegged
    ];

    // Try to get USD/SAR and USD/AED from FMP to compute cross rate
    const crossSymbols = ['USDSAR', 'USDAED', 'USDGBP', 'USDEUR', 'USDCNY'].join(',');
    const crossData = await fetchJSON(
      `https://financialmodelingprep.com/stable/quote?symbol=${crossSymbols}&apikey=${key}`
    );
    const crossBySymbol = {};
    if (Array.isArray(crossData)) {
      crossData.forEach(q => { crossBySymbol[q.symbol] = q.price; });
    }

    // Also try the /fx/ endpoints individually for missing pairs
    const usdGbp = crossBySymbol['USDGBP'] || (await fetchJSON(`https://financialmodelingprep.com/api/v3/fx/GBPUSD?apikey=${key}`))?.then?.(d => d?.[0]?.bid);

    // Build crosses: PKR per foreign = USDPKR / USD per foreign
    const usdCrossMap = {
      'PKR/SAR': crossBySymbol['USDSAR'] || 3.75,   // SAR fixed peg
      'PKR/AED': crossBySymbol['USDAED'] || 3.672,  // AED fixed peg
      'PKR/GBP': crossBySymbol['USDGBP'] || null,
      'PKR/EUR': crossBySymbol['USDEUR'] || null,
      'PKR/CNY': crossBySymbol['USDCNY'] || null,
    };

    Object.entries(usdCrossMap).forEach(([pairKey, usdPerForeign]) => {
      if (!results[pairKey] && usdPerForeign && usdpkr) {
        // PKR per 1 foreign = (PKR per USD) / (foreign per USD) = usdpkr / usdPerForeign
        // But usdPerForeign here is "USD per 1 foreign" (e.g. GBPUSD = 1.27)
        // So: PKR per 1 GBP = usdpkr * 1.27
        const pkrPerForeign = usdpkr * parseFloat(usdPerForeign);
        const cfg = FX_CONFIG.find(f => f.key === pairKey);
        if (cfg && pkrPerForeign > 0) {
          results[pairKey] = {
            key:       pairKey,
            flag:      cfg.flag,
            base:      cfg.base,
            label:     cfg.label,
            context:   cfg.context,
            rate:      pkrPerForeign.toFixed(4),
            rateRound: pkrPerForeign.toFixed(2),
            change:    null,
            dir:       null,
            display:   `1 ${cfg.base} = PKR ${pkrPerForeign.toFixed(2)}`,
            source:    'FMP cross-rate'
          };
        }
      }
    });
  }

  // Return in consistent order
  const ordered = {};
  FX_CONFIG.forEach(cfg => {
    if (results[cfg.key]) ordered[cfg.key] = results[cfg.key];
  });
  return Object.keys(ordered).length ? ordered : null;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
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
  const { action } = payload;

  if (!action || action === 'rates') {
    const rates = await getAllFxRates(key);
    if (!rates) {
      return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'FX rate service unavailable. Please try again.' }) };
    }
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        rates,
        pairs: FX_CONFIG.map(f => f.key),
        sbpNote: 'Interbank mid-market rates via FMP. Open market rates in Pakistan may differ by PKR 1–3.',
        source: 'Financial Modeling Prep (FMP)',
        timestamp: new Date().toISOString()
      })
    };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid action. Use: rates' }) };
};
