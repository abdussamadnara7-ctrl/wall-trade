// ── WALL-TRADE FOREX FUNCTION ─────────────────────────────────
// Env var: FMP_API_KEY

const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log(`FX fetch ${url.slice(0,80)} → status ${res.statusCode}, len ${body.length}`);
        try { resolve(JSON.parse(body)); } catch(e) { console.log('FX parse error:', e.message, body.slice(0,200)); resolve(null); }
      });
    }).on('error', e => { clearTimeout(timer); console.log('FX network error:', e.message); resolve(null); });
  });
}

const FX_PAIRS = [
  { key:'PKR/USD', sym:'USDPKR',  base:'USD', flag:'🇺🇸', label:'US Dollar',      type:'direct',  context:'Primary benchmark. SBP managed float.' },
  { key:'PKR/SAR', sym:'USDSAR',  base:'SAR', flag:'🇸🇦', label:'Saudi Riyal',    type:'div',     context:'Largest remittance corridor — ~3.5M Pakistanis in KSA.' },
  { key:'PKR/AED', sym:'USDAED',  base:'AED', flag:'🇦🇪', label:'UAE Dirham',     type:'div',     context:'Second-largest remittance source. AED pegged to USD.' },
  { key:'PKR/GBP', sym:'GBPUSD',  base:'GBP', flag:'🇬🇧', label:'British Pound',  type:'mul',     context:'UK-Pakistan diaspora remittances.' },
  { key:'PKR/EUR', sym:'EURUSD',  base:'EUR', flag:'🇪🇺', label:'Euro',           type:'mul',     context:'EU trade partner. Textile exports invoiced in EUR.' },
  { key:'PKR/CNY', sym:'USDCNY',  base:'CNY', flag:'🇨🇳', label:'Chinese Yuan',   type:'div',     context:'CPEC & bilateral trade. China is Pakistan\'s largest partner.' },
];

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
  console.log('FMP key present:', !!key, 'key prefix:', key?.slice(0,8));

  if (!key) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'FMP_API_KEY not set' }) };

  // ── Try FMP batch quote ───────────────────────────────────
  const symbols = FX_PAIRS.map(p => p.sym).join(',');
  console.log('Fetching FMP symbols:', symbols);

  const raw = await fetchJSON(
    `https://financialmodelingprep.com/stable/quote?symbol=${symbols}&apikey=${key}`
  );

  console.log('FMP raw type:', typeof raw, Array.isArray(raw) ? `array[${raw.length}]` : JSON.stringify(raw)?.slice(0,200));

  // Build symbol index
  const bySymbol = {};
  if (Array.isArray(raw)) {
    raw.forEach(q => {
      console.log(`  symbol=${q.symbol} price=${q.price}`);
      if (q.symbol && q.price != null) bySymbol[q.symbol] = q;
    });
  }

  // Get USDPKR as anchor
  const usdpkrQ = bySymbol['USDPKR'];
  console.log('USDPKR quote:', JSON.stringify(usdpkrQ));

  if (!usdpkrQ) {
    // ── Fallback: try individual FMP forex endpoint ───────
    console.log('USDPKR missing from batch — trying /api/v3/fx/USDPKR');
    const fxFallback = await fetchJSON(
      `https://financialmodelingprep.com/api/v3/fx/USDPKR?apikey=${key}`
    );
    console.log('FX fallback:', JSON.stringify(fxFallback)?.slice(0,200));

    // ── Last resort: ExchangeRate-API ─────────────────────
    console.log('Trying ExchangeRate-API as last resort');
    const erData = await fetchJSON('https://open.er-api.com/v6/latest/USD');
    if (erData?.rates?.PKR) {
      const usdpkr = parseFloat(erData.rates.PKR);
      console.log('ExchangeRate-API USDPKR:', usdpkr);

      // Build rates from ExchangeRate-API only
      const rates = {};
      const erRates = erData.rates;
      FX_PAIRS.forEach(cfg => {
        let pkrRate;
        if (cfg.base === 'USD') pkrRate = usdpkr;
        else if (erRates[cfg.base]) {
          // ExchangeRate-API: rates are "X per 1 USD"
          pkrRate = usdpkr / erRates[cfg.base];
        }
        if (pkrRate) {
          rates[cfg.key] = {
            key: cfg.key, flag: cfg.flag, base: cfg.base,
            label: cfg.label, context: cfg.context,
            rate: pkrRate.toFixed(4), rateRound: pkrRate.toFixed(2),
            display: `1 ${cfg.base} = PKR ${pkrRate.toFixed(2)}`,
            change: null, dir: null, source: 'ExchangeRate-API'
          };
        }
      });

      if (Object.keys(rates).length) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({
          rates, pairs: FX_PAIRS.map(p => p.key),
          sbpNote: 'Interbank mid-market rates. Open market may differ by PKR 1–3.',
          source: 'ExchangeRate-API (fallback)', timestamp: new Date().toISOString()
        })};
      }
    }

    return { statusCode: 503, headers: CORS, body: JSON.stringify({
      error: 'All FX data sources unavailable. Please try again.',
      debug: { fmpKeyPresent: !!key, symbolsTried: symbols }
    })};
  }

  const usdpkr = parseFloat(usdpkrQ.price);
  const rates = {};

  FX_PAIRS.forEach(cfg => {
    const q = bySymbol[cfg.sym];
    let pkrRate, change = null;

    if (cfg.base === 'USD') {
      pkrRate = usdpkr;
      change = q?.changesPercentage != null ? parseFloat(q.changesPercentage) : null;
    } else if (q?.price) {
      const fp = parseFloat(q.price);
      change = q.changesPercentage != null ? parseFloat(q.changesPercentage) : null;
      if (cfg.type === 'mul') pkrRate = usdpkr * fp;       // GBPUSD, EURUSD
      else                    pkrRate = usdpkr / fp;       // USDSAR, USDAED, USDCNY
    } else {
      // Hardcoded pegs for SAR/AED if FMP didn't return them
      if (cfg.base === 'SAR') pkrRate = usdpkr / 3.7500;
      if (cfg.base === 'AED') pkrRate = usdpkr / 3.6725;
    }

    if (pkrRate) {
      rates[cfg.key] = {
        key: cfg.key, flag: cfg.flag, base: cfg.base,
        label: cfg.label, context: cfg.context,
        rate: pkrRate.toFixed(4), rateRound: pkrRate.toFixed(2),
        change: change != null ? change.toFixed(2) : null,
        dir:    change != null ? (change >= 0 ? 'up' : 'dn') : null,
        display: `1 ${cfg.base} = PKR ${pkrRate.toFixed(2)}`,
        source: 'FMP'
      };
    }
  });

  console.log('Rates built:', Object.keys(rates).join(', '));

  return { statusCode: 200, headers: CORS, body: JSON.stringify({
    rates, pairs: FX_PAIRS.map(p => p.key),
    sbpNote: 'Interbank mid-market rates. Open market may differ by PKR 1–3.',
    source: 'Financial Modeling Prep (FMP)', timestamp: new Date().toISOString()
  })};
};
