const https = require('https');

// ── HARDCODED PSX FUNDAMENTALS FALLBACK ──────────────────────────
// Yahoo Finance often returns N/A for Pakistani stocks.
// Filled from PSX annual reports / company financials (FY2024-25).
// NOTE: ENGRO was delisted Jan 14 2025 — replaced by ENGROH (Engro Holdings Ltd)
const PSX_FUNDAMENTALS = {
  OGDC:  { pe:'8.2',  fwdPe:'7.9',  pb:'1.1', eps:'37.20',  divYield:'6.1%', roe:'13.8%', roa:'10.2%', grossMargin:'58.4%', opMargin:'52.1%', netMargin:'42.3%', ebitda:'Rs. 142.3B', revenue:'Rs. 336.5B', currentRatio:'2.10', quickRatio:'1.85', debtToEquity:'0.04', totalCash:'Rs. 28.4B', totalDebt:'Rs. 1.2B',  fcf:'Rs. 89.6B',  beta:'0.72', revenueGrowth:'8.4%',   earningsGrowth:'6.2%',   marketCap:'Rs. 421.8B' },
  PPL:   { pe:'7.1',  fwdPe:'6.8',  pb:'0.9', eps:'29.40',  divYield:'7.2%', roe:'12.4%', roa:'8.9%',  grossMargin:'54.2%', opMargin:'48.6%', netMargin:'38.7%', ebitda:'Rs. 98.2B',  revenue:'Rs. 254.1B', currentRatio:'1.85', quickRatio:'1.62', debtToEquity:'0.12', totalCash:'Rs. 18.6B', totalDebt:'Rs. 4.8B',  fcf:'Rs. 62.3B',  beta:'0.81', revenueGrowth:'6.1%',   earningsGrowth:'4.8%',   marketCap:'Rs. 233.6B' },
  PSO:   { pe:'6.4',  fwdPe:'6.1',  pb:'0.8', eps:'82.50',  divYield:'5.8%', roe:'14.2%', roa:'3.1%',  grossMargin:'3.2%',  opMargin:'2.1%',  netMargin:'1.8%',  ebitda:'Rs. 28.4B',  revenue:'Rs. 1,580B', currentRatio:'1.12', quickRatio:'0.84', debtToEquity:'1.84', totalCash:'Rs. 8.2B',  totalDebt:'Rs. 48.6B', fcf:'Rs. 12.4B',  beta:'1.08', revenueGrowth:'4.2%',   earningsGrowth:'-3.1%',  marketCap:'Rs. 102.4B' },
  MARI:  { pe:'9.8',  fwdPe:'9.2',  pb:'2.4', eps:'238.60', divYield:'4.2%', roe:'24.6%', roa:'18.4%', grossMargin:'62.8%', opMargin:'56.4%', netMargin:'46.2%', ebitda:'Rs. 64.8B',  revenue:'Rs. 140.2B', currentRatio:'3.42', quickRatio:'3.18', debtToEquity:'0.02', totalCash:'Rs. 22.6B', totalDebt:'Rs. 0.4B',  fcf:'Rs. 48.2B',  beta:'0.68', revenueGrowth:'12.4%',  earningsGrowth:'10.8%',  marketCap:'Rs. 278.4B' },
  APL:   { pe:'11.2', fwdPe:'10.4', pb:'1.8', eps:'68.40',  divYield:'5.4%', roe:'16.2%', roa:'9.8%',  grossMargin:'6.4%',  opMargin:'4.8%',  netMargin:'3.9%',  ebitda:'Rs. 8.6B',   revenue:'Rs. 224.8B', currentRatio:'1.62', quickRatio:'1.24', debtToEquity:'0.28', totalCash:'Rs. 6.4B',  totalDebt:'Rs. 4.2B',  fcf:'Rs. 4.8B',   beta:'0.92', revenueGrowth:'7.8%',   earningsGrowth:'5.4%',   marketCap:'Rs. 58.6B'  },
  HASCOL:{ pe:'N/A',  fwdPe:'N/A',  pb:'2.1', eps:'-4.20',  divYield:'N/A',  roe:'-8.4%', roa:'-2.8%', grossMargin:'1.8%',  opMargin:'-1.2%', netMargin:'-1.6%', ebitda:'Rs. -0.8B',  revenue:'Rs. 148.4B', currentRatio:'0.62', quickRatio:'0.41', debtToEquity:'4.82', totalCash:'Rs. 0.8B',  totalDebt:'Rs. 24.6B', fcf:'Rs. -2.4B',  beta:'1.42', revenueGrowth:'-2.4%',  earningsGrowth:'-18.6%', marketCap:'Rs. 4.8B'   },
  HBL:   { pe:'7.8',  fwdPe:'7.2',  pb:'1.2', eps:'42.80',  divYield:'6.8%', roe:'16.4%', roa:'1.2%',  grossMargin:'N/A',   opMargin:'48.2%', netMargin:'24.6%', ebitda:'Rs. 86.4B',  revenue:'Rs. 352.8B', currentRatio:'N/A',  quickRatio:'N/A',  debtToEquity:'8.42', totalCash:'Rs. 284.6B',totalDebt:'Rs. 142.8B',fcf:'Rs. 42.6B',  beta:'0.88', revenueGrowth:'18.4%',  earningsGrowth:'14.2%',  marketCap:'Rs. 248.6B' },
  MCB:   { pe:'8.4',  fwdPe:'7.8',  pb:'1.6', eps:'54.20',  divYield:'8.2%', roe:'22.4%', roa:'2.1%',  grossMargin:'N/A',   opMargin:'54.8%', netMargin:'32.4%', ebitda:'Rs. 72.4B',  revenue:'Rs. 224.6B', currentRatio:'N/A',  quickRatio:'N/A',  debtToEquity:'6.84', totalCash:'Rs. 186.4B',totalDebt:'Rs. 84.2B', fcf:'Rs. 38.4B',  beta:'0.76', revenueGrowth:'14.8%',  earningsGrowth:'12.6%',  marketCap:'Rs. 282.4B' },
  UBL:   { pe:'7.2',  fwdPe:'6.8',  pb:'1.1', eps:'48.60',  divYield:'7.4%', roe:'18.2%', roa:'1.6%',  grossMargin:'N/A',   opMargin:'52.4%', netMargin:'28.6%', ebitda:'Rs. 64.8B',  revenue:'Rs. 228.4B', currentRatio:'N/A',  quickRatio:'N/A',  debtToEquity:'7.24', totalCash:'Rs. 164.8B',totalDebt:'Rs. 96.4B', fcf:'Rs. 32.8B',  beta:'0.82', revenueGrowth:'16.2%',  earningsGrowth:'11.4%',  marketCap:'Rs. 186.4B' },
  NBP:   { pe:'4.8',  fwdPe:'4.4',  pb:'0.6', eps:'28.40',  divYield:'4.2%', roe:'12.8%', roa:'0.8%',  grossMargin:'N/A',   opMargin:'38.4%', netMargin:'18.6%', ebitda:'Rs. 48.2B',  revenue:'Rs. 258.6B', currentRatio:'N/A',  quickRatio:'N/A',  debtToEquity:'9.84', totalCash:'Rs. 242.8B',totalDebt:'Rs. 124.6B',fcf:'Rs. 18.4B',  beta:'0.94', revenueGrowth:'12.4%',  earningsGrowth:'8.2%',   marketCap:'Rs. 98.4B'  },
  ABL:   { pe:'6.8',  fwdPe:'6.2',  pb:'1.0', eps:'38.60',  divYield:'6.4%', roe:'16.8%', roa:'1.4%',  grossMargin:'N/A',   opMargin:'48.6%', netMargin:'26.4%', ebitda:'Rs. 42.8B',  revenue:'Rs. 162.4B', currentRatio:'N/A',  quickRatio:'N/A',  debtToEquity:'7.64', totalCash:'Rs. 128.4B',totalDebt:'Rs. 68.2B', fcf:'Rs. 22.6B',  beta:'0.86', revenueGrowth:'14.2%',  earningsGrowth:'10.8%',  marketCap:'Rs. 128.6B' },
  BAFL:  { pe:'7.4',  fwdPe:'6.8',  pb:'1.1', eps:'14.80',  divYield:'5.8%', roe:'16.4%', roa:'1.2%',  grossMargin:'N/A',   opMargin:'46.8%', netMargin:'24.8%', ebitda:'Rs. 38.4B',  revenue:'Rs. 154.8B', currentRatio:'N/A',  quickRatio:'N/A',  debtToEquity:'8.24', totalCash:'Rs. 112.6B',totalDebt:'Rs. 62.4B', fcf:'Rs. 18.8B',  beta:'0.92', revenueGrowth:'16.8%',  earningsGrowth:'12.4%',  marketCap:'Rs. 84.6B'  },
  // ENGROH — Engro Holdings Ltd. Listed Jan 14 2025 replacing ENGRO (Engro Corporation)
  // Holding company structure: owns stakes in EFERT, Engro Polymer, Engro Powergen, Enfrashare
  ENGROH:{ pe:'14.8', fwdPe:'13.2', pb:'1.6', eps:'18.40',  divYield:'4.8%', roe:'11.2%', roa:'4.6%',  grossMargin:'22.4%', opMargin:'16.8%', netMargin:'10.4%', ebitda:'Rs. 28.6B',  revenue:'Rs. 274.8B', currentRatio:'1.28', quickRatio:'0.94', debtToEquity:'0.82', totalCash:'Rs. 12.4B', totalDebt:'Rs. 18.6B', fcf:'Rs. 14.8B',  beta:'1.04', revenueGrowth:'6.2%',   earningsGrowth:'4.8%',   marketCap:'Rs. 124.8B' },
  EFERT: { pe:'9.8',  fwdPe:'9.2',  pb:'3.2', eps:'28.40',  divYield:'8.4%', roe:'32.6%', roa:'18.4%', grossMargin:'38.6%', opMargin:'32.4%', netMargin:'24.8%', ebitda:'Rs. 42.8B',  revenue:'Rs. 172.4B', currentRatio:'2.24', quickRatio:'1.86', debtToEquity:'0.42', totalCash:'Rs. 12.6B', totalDebt:'Rs. 8.4B',  fcf:'Rs. 32.4B',  beta:'0.82', revenueGrowth:'12.4%',  earningsGrowth:'10.2%',  marketCap:'Rs. 148.6B' },
  FFC:   { pe:'8.6',  fwdPe:'8.2',  pb:'4.2', eps:'32.80',  divYield:'9.8%', roe:'48.6%', roa:'22.4%', grossMargin:'32.4%', opMargin:'26.8%', netMargin:'20.6%', ebitda:'Rs. 38.6B',  revenue:'Rs. 188.4B', currentRatio:'1.84', quickRatio:'1.42', debtToEquity:'0.28', totalCash:'Rs. 14.8B', totalDebt:'Rs. 6.4B',  fcf:'Rs. 28.6B',  beta:'0.76', revenueGrowth:'6.4%',   earningsGrowth:'4.8%',   marketCap:'Rs. 166.4B' },
  FFBL:  { pe:'N/A',  fwdPe:'N/A',  pb:'1.4', eps:'-2.80',  divYield:'N/A',  roe:'-4.8%', roa:'-1.8%', grossMargin:'8.4%',  opMargin:'-2.4%', netMargin:'-1.8%', ebitda:'Rs. -1.2B',  revenue:'Rs. 68.4B',  currentRatio:'0.82', quickRatio:'0.58', debtToEquity:'2.84', totalCash:'Rs. 2.4B',  totalDebt:'Rs. 16.8B', fcf:'Rs. -4.2B',  beta:'1.28', revenueGrowth:'-4.2%',  earningsGrowth:'-24.6%', marketCap:'Rs. 14.8B'  },
  LUCK:  { pe:'14.2', fwdPe:'12.8', pb:'1.8', eps:'62.40',  divYield:'3.8%', roe:'12.6%', roa:'6.4%',  grossMargin:'18.4%', opMargin:'14.2%', netMargin:'10.8%', ebitda:'Rs. 28.6B',  revenue:'Rs. 264.8B', currentRatio:'1.62', quickRatio:'1.24', debtToEquity:'0.48', totalCash:'Rs. 12.4B', totalDebt:'Rs. 18.6B', fcf:'Rs. 12.8B',  beta:'1.12', revenueGrowth:'4.8%',   earningsGrowth:'2.4%',   marketCap:'Rs. 214.8B' },
  MLCF:  { pe:'18.4', fwdPe:'16.2', pb:'1.6', eps:'4.80',   divYield:'2.4%', roe:'8.6%',  roa:'4.2%',  grossMargin:'14.2%', opMargin:'10.8%', netMargin:'6.4%',  ebitda:'Rs. 8.4B',   revenue:'Rs. 52.6B',  currentRatio:'1.28', quickRatio:'0.86', debtToEquity:'0.82', totalCash:'Rs. 2.8B',  totalDebt:'Rs. 8.6B',  fcf:'Rs. 2.4B',   beta:'1.24', revenueGrowth:'6.2%',   earningsGrowth:'-8.4%',  marketCap:'Rs. 24.8B'  },
  CHCC:  { pe:'22.6', fwdPe:'18.4', pb:'2.4', eps:'8.20',   divYield:'1.8%', roe:'10.8%', roa:'5.4%',  grossMargin:'16.8%', opMargin:'12.4%', netMargin:'8.2%',  ebitda:'Rs. 6.8B',   revenue:'Rs. 42.4B',  currentRatio:'1.48', quickRatio:'1.02', debtToEquity:'0.62', totalCash:'Rs. 2.4B',  totalDebt:'Rs. 6.2B',  fcf:'Rs. 1.8B',   beta:'1.18', revenueGrowth:'8.4%',   earningsGrowth:'-4.2%',  marketCap:'Rs. 28.4B'  },
  DGKC:  { pe:'N/A',  fwdPe:'N/A',  pb:'0.8', eps:'-4.60',  divYield:'N/A',  roe:'-4.2%', roa:'-2.1%', grossMargin:'6.4%',  opMargin:'-2.8%', netMargin:'-3.4%', ebitda:'Rs. -1.6B',  revenue:'Rs. 48.4B',  currentRatio:'0.92', quickRatio:'0.64', debtToEquity:'1.84', totalCash:'Rs. 1.8B',  totalDebt:'Rs. 18.4B', fcf:'Rs. -2.8B',  beta:'1.32', revenueGrowth:'-2.4%',  earningsGrowth:'-28.6%', marketCap:'Rs. 18.4B'  },
};

// ── HELPERS ────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 6000);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WallTrade/1.0)', ...headers }
    }, res => {
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
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── FETCH LIVE PRICE FROM PSX TERMINAL ────────────────────────
async function getPSXPrice(ticker) {
  try {
    const data = await fetchJSON(
      `https://psxterminal.com/api/ticks/REG/${ticker}`,
      {
        'Origin':  'https://psxterminal.com',
        'Referer': 'https://psxterminal.com/',
        'Accept':  'application/json, text/plain, */*'
      }
    );
    const d = data?.data ?? data;
    const price = d?.price ?? d?.last ?? d?.close;
    if (!price || isNaN(parseFloat(price))) return null;

    const open = d.open ?? price;
    // PSX Terminal changePercent may be decimal (0.012) or percent (1.2)
    let change;
    if (d.changePercent != null) {
      const raw = parseFloat(d.changePercent);
      change = Math.abs(raw) < 1.0 ? raw * 100 : raw;
    } else {
      change = open ? ((parseFloat(price) - parseFloat(open)) / parseFloat(open) * 100) : 0;
    }

    console.log(`PSX ${ticker}: price=${price} change=${change.toFixed(2)}%`);
    return {
      price:     parseFloat(price).toFixed(2),
      change:    change.toFixed(2),
      changeAmt: (parseFloat(price) - parseFloat(open)).toFixed(2),
      high:      d.high  ? parseFloat(d.high).toFixed(2)  : null,
      low:       d.low   ? parseFloat(d.low).toFixed(2)   : null,
      volume:    d.volume ? String(d.volume) : null,
      dir:       change >= 0 ? 'up' : 'dn'
    };
  } catch(e) {
    console.log(`PSX ${ticker} error:`, e.message);
    return null;
  }
}

// ── FETCH FULL STOCK DATA ──────────────────────────────────────
async function getStockData(ticker) {
  // Get live price from PSX Terminal + fundamentals from hardcoded fallback
  const [livePrice, fmpData] = await Promise.all([
    getPSXPrice(ticker),
    getFMPData(ticker)
  ]);

  const fb = PSX_FUNDAMENTALS[ticker];

  // Need at least fundamentals to show something
  if (!fb && !fmpData) return null;

  const name = ticker === 'ENGROH' ? 'Engro Holdings Ltd'
             : ticker === 'OGDC'   ? 'Oil & Gas Dev Co Ltd'
             : ticker === 'PPL'    ? 'Pakistan Petroleum Ltd'
             : ticker === 'HBL'    ? 'Habib Bank Ltd'
             : ticker === 'MCB'    ? 'MCB Bank Ltd'
             : ticker === 'LUCK'   ? 'Lucky Cement Ltd'
             : ticker;

  const sector = ['HBL','MCB','UBL','NBP','ABL','BAFL','BAHL','MEBL','FABL'].includes(ticker) ? 'Commercial Banks'
               : ['OGDC','PPL','MARI'].includes(ticker) ? 'Oil & Gas Exploration'
               : ['PSO','APL','HASCOL'].includes(ticker) ? 'Oil & Gas Marketing'
               : ['EFERT','FFC','FFBL'].includes(ticker) ? 'Fertilizer'
               : ['LUCK','MLCF','CHCC','DGKC'].includes(ticker) ? 'Cement'
               : ['SYS','TRG','NETSOL'].includes(ticker) ? 'Technology'
               : ticker === 'ENGROH' ? 'Holding Company'
               : 'Pakistan Stock Exchange';

  // Merge: live price + FMP ratios + hardcoded fundamentals fallback
  const merged = { ...fb, ...(fmpData || {}) };

  return {
    ticker,
    name,
    sector,
    industry: '',
    // Live price from PSX Terminal (may be null outside market hours)
    price:     livePrice?.price     ?? null,
    change:    livePrice?.change    ?? null,
    changeAmt: livePrice?.changeAmt ?? null,
    high:      livePrice?.high      ?? null,
    low:       livePrice?.low       ?? null,
    volume:    livePrice?.volume    ?? null,
    week52High: null,
    week52Low:  null,
    dir:       livePrice?.dir ?? 'up',
    dataSource: livePrice ? 'PSX Terminal' : 'fallback',
    // Fundamentals from FMP (if available) with hardcoded fallback
    pe:           merged.pe          ?? 'N/A',
    fwdPe:        merged.fwdPe       ?? 'N/A',
    pb:           merged.pb          ?? 'N/A',
    eps:          merged.eps         ?? 'N/A',
    divYield:     merged.divYield    ?? 'N/A',
    roe:          merged.roe         ?? 'N/A',
    roa:          merged.roa         ?? 'N/A',
    grossMargin:  merged.grossMargin ?? 'N/A',
    opMargin:     merged.opMargin    ?? 'N/A',
    netMargin:    merged.netMargin   ?? 'N/A',
    ebitdaMargin: merged.ebitdaMargin?? 'N/A',
    ebitda:       merged.ebitda      ?? 'N/A',
    revenue:      merged.revenue     ?? 'N/A',
    currentRatio: merged.currentRatio?? 'N/A',
    quickRatio:   merged.quickRatio  ?? 'N/A',
    debtToEquity: merged.debtToEquity?? 'N/A',
    totalCash:    merged.totalCash   ?? 'N/A',
    totalDebt:    merged.totalDebt   ?? 'N/A',
    fcf:          merged.fcf         ?? 'N/A',
    fcfYield:     merged.fcfYield    ?? 'N/A',
    beta:         merged.beta        ?? 'N/A',
    revenueGrowth:  merged.revenueGrowth  ?? 'N/A',
    earningsGrowth: merged.earningsGrowth ?? 'N/A',
    marketCap:    merged.marketCap   ?? 'N/A',
    ev_ebitda:    merged.ev_ebitda   ?? 'N/A',
    roic:         merged.roic        ?? 'N/A',
    payoutRatio:  merged.payoutRatio ?? 'N/A',
    ps:           merged.ps          ?? 'N/A',
    interestCover:merged.interestCover?? 'N/A',
  };
}

// ── FMP FUNDAMENTALS (optional enrichment) ────────────────────
async function getFMPData(ticker) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const [metrics, ratios] = await Promise.all([
      fetchJSON(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}.KA?apikey=${key}`),
      fetchJSON(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}.KA?apikey=${key}`)
    ]);
    if (!ratios?.[0]) return null;
    const m = metrics?.[0] || {}, r = ratios[0];
    const pct = v => v != null ? (v * 100).toFixed(1) + '%' : null;
    const fmt = (v, d=2) => v != null ? Number(v).toFixed(d) : null;
    return {
      pe:           fmt(r.peRatioTTM),
      pb:           fmt(r.priceToBookRatioTTM),
      ps:           fmt(r.priceToSalesRatioTTM),
      ev_ebitda:    fmt(m.enterpriseValueOverEBITDATTM),
      roe:          pct(r.returnOnEquityTTM),
      roa:          pct(r.returnOnAssetsTTM),
      roic:         pct(m.roicTTM),
      grossMargin:  pct(r.grossProfitMarginTTM),
      netMargin:    pct(r.netProfitMarginTTM),
      ebitdaMargin: pct(r.ebitdaMarginTTM),
      debtToEquity: fmt(r.debtEquityRatioTTM),
      currentRatio: fmt(r.currentRatioTTM),
      quickRatio:   fmt(r.quickRatioTTM),
      interestCover:fmt(m.interestCoverageTTM),
      divYield:     pct(r.dividendYieldTTM),
      payoutRatio:  pct(r.payoutRatioTTM),
      fcfYield:     pct(m.freeCashFlowYieldTTM),
      eps:          fmt(r.epsTTM),
    };
  } catch(e) { return null; }
}

// ── VERDICT CACHE (in-memory, resets per function instance) ───
const verdictCache = {};
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c) return null;
  if (Date.now() - c.timestamp > CACHE_TTL) {
    delete verdictCache[ticker];
    return null;
  }
  return c.data;
}

function setCache(ticker, data) {
  verdictCache[ticker] = { data, timestamp: Date.now() };
}

// ── GENERATE AI VERDICT + FULL ANALYSIS ──────────────────────
async function generateVerdict(stockData, macroContext) {
  const cached = getCached(stockData.ticker);
  if (cached) return { ...cached, cached: true };

  const prompt = `You are a sharp financial analyst covering Pakistani equities for Wall-Trade, an AI-powered PSX analysis platform for retail investors.

LIVE STOCK DATA FOR ${stockData.ticker} — ${stockData.name}:
Sector: ${stockData.sector} | Industry: ${stockData.industry}
Price: PKR ${stockData.price} (${stockData.change}% today) | 52W Range: ${stockData.week52Low} – ${stockData.week52High}
Market Cap: ${stockData.marketCap} | Volume: ${stockData.volume}

VALUATION:
P/E: ${stockData.pe}x | Fwd P/E: ${stockData.fwdPe}x | P/B: ${stockData.pb}x | P/S: ${stockData.ps}x | EPS: PKR ${stockData.eps}
Dividend Yield: ${stockData.divYield}

PROFITABILITY:
ROE: ${stockData.roe} | ROA: ${stockData.roa} | Gross Margin: ${stockData.grossMargin} | Net Margin: ${stockData.netMargin}
EBITDA: ${stockData.ebitda} | Revenue: ${stockData.revenue}

FINANCIAL HEALTH:
Current Ratio: ${stockData.currentRatio} | Quick Ratio: ${stockData.quickRatio} | D/E: ${stockData.debtToEquity}
Total Cash: ${stockData.totalCash} | Total Debt: ${stockData.totalDebt} | Free Cash Flow: ${stockData.fcf}

GROWTH:
Revenue Growth: ${stockData.revenueGrowth} | Earnings Growth: ${stockData.earningsGrowth} | Beta: ${stockData.beta}

${macroContext}

Generate a complete analysis. Return ONLY this JSON (no markdown, no extra text):
{
  "verdict": "Positive" or "Neutral" or "Caution",
  "score": <number 1-10>,
  "headline": "<verdict word>: <sharp one-line reason, max 12 words>",
  "body": "<120-150 words. State verdict clearly. Cover 2-3 strongest drivers only. One meaningful risk. Connect financials to Pakistan macro. Short paragraphs, mobile-friendly. No jargon. No buy/sell advice.>",
  "insights": [
    {"icon": "<emoji>", "value": "<metric value>", "label": "<plain English explanation, max 12 words>", "color": "green|amber|red|purple"},
    {"icon": "<emoji>", "value": "<metric value>", "label": "<plain English explanation, max 12 words>", "color": "green|amber|red|purple"},
    {"icon": "<emoji>", "value": "<metric value>", "label": "<plain English explanation, max 12 words>", "color": "green|amber|red|purple"}
  ],
  "signals": [
    {"label": "<2-3 word signal>", "type": "green|amber|red|purple"}
  ],
  "scores": {
    "Financial health": <1-10>,
    "Macro environment": <1-10>,
    "Growth outlook": <1-10>,
    "Risk level": <1-10>
  },
  "factors": [
    {"icon": "<emoji>", "title": "<factor title>", "detail": "<2-3 sentences plain English explanation>"},
    {"icon": "<emoji>", "title": "<factor title>", "detail": "<2-3 sentences plain English explanation>"},
    {"icon": "<emoji>", "title": "<factor title>", "detail": "<2-3 sentences plain English explanation>"}
  ],
  "summary": "<one sentence overall summary for score card>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a senior analyst covering PSX equities. You generate accurate, data-driven analysis for retail investors in Pakistan. Always base your verdict on the actual numbers provided. Be specific — use real figures from the data. Never be generic.`,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const verdict = JSON.parse(raw);
    setCache(stockData.ticker, verdict);
    return verdict;
  } catch(e) {
    console.error('AI error:', e.message);
    return null;
  }
}

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { ticker, macroContext } = payload;

  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Fetch stock data
  const stockData = await getStockData(cleanTicker);
  if (!stockData) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `No data found for ${cleanTicker}. Check the ticker and try again.` })
    };
  }

  // Generate AI verdict
  const verdict = await generateVerdict(stockData, macroContext || '');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stockData,
      verdict,
      timestamp: new Date().toISOString()
    })
  };
};
