const https = require('https');

// ─────────────────────────────────────────────────────────────────────────────
// PSX FUNDAMENTALS — Updated April 2026 (FY2025 annual reports)
// ─────────────────────────────────────────────────────────────────────────────
const FUNDAMENTALS = {
  OGDC:   { name:"Oil & Gas Development Co.", sector:"Energy", industry:"Exploration & Production", pe:"8.1", pb:"1.1", eps:"38.40", divYield:"6.2%", roe:"14.1%", roa:"10.5%", grossMargin:"59.2%", netMargin:"43.1%", opMargin:"52.8%", ebitda:"Rs. 148B", revenue:"Rs. 344B", currentRatio:"2.14", debtToEquity:"0.04", totalDebt:"Rs. 1.2B", totalCash:"Rs. 30B", fcf:"Rs. 92B", marketCap:"Rs. 440B", revenueGrowth:"8.8%", earningsGrowth:"6.4%", beta:"0.72", week52Note:"State-backed E&P leader — circular debt is the key overhang" },
  PPL:    { name:"Pakistan Petroleum Ltd", sector:"Energy", industry:"Exploration & Production", pe:"7.0", pb:"0.9", eps:"30.20", divYield:"7.4%", roe:"12.8%", roa:"9.2%", grossMargin:"55.1%", netMargin:"39.4%", opMargin:"49.2%", ebitda:"Rs. 100B", revenue:"Rs. 258B", currentRatio:"1.88", debtToEquity:"0.11", totalDebt:"Rs. 4.6B", totalCash:"Rs. 19B", fcf:"Rs. 64B", marketCap:"Rs. 240B", revenueGrowth:"6.4%", earningsGrowth:"5.0%", beta:"0.80", week52Note:"Sui gas field in long-term decline — new discoveries are the catalyst" },
  PSO:    { name:"Pakistan State Oil", sector:"Energy", industry:"Oil Marketing Company", pe:"6.2", pb:"0.8", eps:"84.60", divYield:"5.6%", roe:"14.6%", roa:"3.2%", grossMargin:"3.1%", netMargin:"1.7%", opMargin:"2.0%", ebitda:"Rs. 29B", revenue:"Rs. 1620B", currentRatio:"1.10", debtToEquity:"1.88", totalDebt:"Rs. 50B", totalCash:"Rs. 8B", fcf:"Rs. 12B", marketCap:"Rs. 106B", revenueGrowth:"4.4%", earningsGrowth:"-3.4%", beta:"1.08", week52Note:"Rs. 800B+ unpaid receivables — state-backed but deep value trap" },
  MARI:   { name:"Mari Petroleum Co.", sector:"Energy", industry:"Exploration & Production", pe:"9.6", pb:"2.4", eps:"244.80", divYield:"4.3%", roe:"25.2%", roa:"18.8%", grossMargin:"63.4%", netMargin:"46.8%", opMargin:"57.1%", ebitda:"Rs. 66B", revenue:"Rs. 143B", currentRatio:"3.48", debtToEquity:"0.02", totalDebt:"Rs. 0.4B", totalCash:"Rs. 23B", fcf:"Rs. 50B", marketCap:"Rs. 292B", revenueGrowth:"12.8%", earningsGrowth:"11.2%", beta:"0.67", week52Note:"Highest quality E&P on PSX — essentially debt-free with best margins" },
  APL:    { name:"Attock Petroleum Ltd", sector:"Energy", industry:"Oil Marketing Company", pe:"11.0", pb:"1.8", eps:"70.20", divYield:"5.6%", roe:"16.6%", roa:"10.1%", grossMargin:"6.2%", netMargin:"3.8%", opMargin:"4.6%", ebitda:"Rs. 8.8B", revenue:"Rs. 230B", currentRatio:"1.64", debtToEquity:"0.27", totalDebt:"Rs. 4.1B", totalCash:"Rs. 6.6B", fcf:"Rs. 5.0B", marketCap:"Rs. 60B", revenueGrowth:"7.6%", earningsGrowth:"5.6%", beta:"0.91", week52Note:"Zero-debt OMC — Attock Group backing with exceptional yield" },
  HASCOL: { name:"Hascol Petroleum Ltd", sector:"Energy", industry:"Oil Marketing Company", pe:"N/A", pb:"2.0", eps:"-4.40", divYield:"N/A", roe:"-8.6%", roa:"-2.9%", grossMargin:"1.6%", netMargin:"-1.7%", opMargin:"-1.3%", ebitda:"Rs. -0.9B", revenue:"Rs. 152B", currentRatio:"0.61", debtToEquity:"4.94", totalDebt:"Rs. 25B", totalCash:"Rs. 0.8B", fcf:"Rs. -2.6B", marketCap:"Rs. 4.9B", revenueGrowth:"-2.6%", earningsGrowth:"-19%", beta:"1.42", week52Note:"Under active debt restructuring — highly speculative, risk of total loss" },
  HBL:    { name:"Habib Bank Ltd", sector:"Banking", industry:"Commercial Banking", pe:"7.6", pb:"1.2", eps:"44.20", divYield:"7.0%", roe:"16.8%", roa:"1.3%", grossMargin:"N/A", netMargin:"25.2%", opMargin:"49.4%", ebitda:"Rs. 88B", revenue:"Rs. 360B", currentRatio:"N/A", debtToEquity:"8.6", totalDebt:"Rs. 146B", totalCash:"Rs. 292B", fcf:"Rs. 44B", marketCap:"Rs. 256B", revenueGrowth:"18.8%", earningsGrowth:"14.6%", beta:"0.87", casaRatio:"78%", nplRatio:"6.1%", week52Note:"Pakistan largest bank by assets — rate cut cycle compresses NIMs" },
  MCB:    { name:"MCB Bank Ltd", sector:"Banking", industry:"Commercial Banking", pe:"8.2", pb:"1.6", eps:"56.40", divYield:"8.4%", roe:"22.8%", roa:"2.2%", grossMargin:"N/A", netMargin:"33.2%", opMargin:"56.2%", ebitda:"Rs. 74B", revenue:"Rs. 228B", currentRatio:"N/A", debtToEquity:"7.0", totalDebt:"Rs. 86B", totalCash:"Rs. 190B", fcf:"Rs. 40B", marketCap:"Rs. 290B", revenueGrowth:"15.2%", earningsGrowth:"12.8%", beta:"0.75", casaRatio:"92%", nplRatio:"4.1%", week52Note:"Best quality bank — 92% CASA is sector-best, cheapest funding" },
  UBL:    { name:"United Bank Ltd", sector:"Banking", industry:"Commercial Banking", pe:"7.0", pb:"1.1", eps:"50.40", divYield:"7.6%", roe:"18.6%", roa:"1.7%", grossMargin:"N/A", netMargin:"29.2%", opMargin:"53.8%", ebitda:"Rs. 66B", revenue:"Rs. 232B", currentRatio:"N/A", debtToEquity:"7.4", totalDebt:"Rs. 98B", totalCash:"Rs. 168B", fcf:"Rs. 34B", marketCap:"Rs. 192B", revenueGrowth:"16.6%", earningsGrowth:"11.8%", beta:"0.81", casaRatio:"76%", nplRatio:"7.8%", week52Note:"Strong GCC international franchise — remittance leader" },
  NBP:    { name:"National Bank of Pakistan", sector:"Banking", industry:"Commercial Banking", pe:"4.6", pb:"0.6", eps:"29.20", divYield:"4.4%", roe:"13.2%", roa:"0.9%", grossMargin:"N/A", netMargin:"19.1%", opMargin:"39.2%", ebitda:"Rs. 50B", revenue:"Rs. 264B", currentRatio:"N/A", debtToEquity:"10.1", totalDebt:"Rs. 128B", totalCash:"Rs. 248B", fcf:"Rs. 19B", marketCap:"Rs. 102B", revenueGrowth:"12.8%", earningsGrowth:"8.4%", beta:"0.93", casaRatio:"73%", nplRatio:"18.2%", week52Note:"State-owned — deepest value but 18% NPL ratio is high" },
  ABL:    { name:"Allied Bank Ltd", sector:"Banking", industry:"Commercial Banking", pe:"6.6", pb:"1.0", eps:"40.20", divYield:"6.6%", roe:"17.2%", roa:"1.5%", grossMargin:"N/A", netMargin:"27.1%", opMargin:"49.8%", ebitda:"Rs. 44B", revenue:"Rs. 166B", currentRatio:"N/A", debtToEquity:"7.8", totalDebt:"Rs. 70B", totalCash:"Rs. 132B", fcf:"Rs. 24B", marketCap:"Rs. 132B", revenueGrowth:"14.6%", earningsGrowth:"11.2%", beta:"0.85", casaRatio:"82%", nplRatio:"4.8%", week52Note:"Best digital banking platform — Ibrahim Group conservative management" },
  BAFL:   { name:"Bank Al Falah Ltd", sector:"Banking", industry:"Commercial Banking", pe:"7.2", pb:"1.1", eps:"15.40", divYield:"6.0%", roe:"16.8%", roa:"1.3%", grossMargin:"N/A", netMargin:"25.4%", opMargin:"48.0%", ebitda:"Rs. 39B", revenue:"Rs. 158B", currentRatio:"N/A", debtToEquity:"8.4", totalDebt:"Rs. 64B", totalCash:"Rs. 116B", fcf:"Rs. 19B", marketCap:"Rs. 86B", revenueGrowth:"17.2%", earningsGrowth:"12.8%", beta:"0.91", casaRatio:"71%", nplRatio:"5.2%", week52Note:"Fast-growing Islamic banking franchise — Abu Dhabi Group backing" },
  ENGROH: { name:"Engro Holdings Ltd", sector:"Conglomerate", industry:"Diversified Industrials", pe:"14.4", pb:"1.6", eps:"18.80", divYield:"4.9%", roe:"11.4%", roa:"4.8%", grossMargin:"22.8%", netMargin:"10.6%", opMargin:"17.2%", ebitda:"Rs. 29B", revenue:"Rs. 280B", currentRatio:"1.30", debtToEquity:"0.80", totalDebt:"Rs. 19B", totalCash:"Rs. 13B", fcf:"Rs. 15B", marketCap:"Rs. 128B", revenueGrowth:"6.4%", earningsGrowth:"5.0%", beta:"1.03", week52Note:"Holding co: EFERT stake + LNG terminal + telecom towers + foods" },
  FFC:    { name:"Fauji Fertiliser Co.", sector:"Fertiliser", industry:"Chemicals", pe:"8.4", pb:"4.2", eps:"33.60", divYield:"10.2%", roe:"49.2%", roa:"22.8%", grossMargin:"33.2%", netMargin:"21.0%", opMargin:"27.4%", ebitda:"Rs. 39B", revenue:"Rs. 192B", currentRatio:"1.86", debtToEquity:"0.27", totalDebt:"Rs. 6.4B", totalCash:"Rs. 15B", fcf:"Rs. 29B", marketCap:"Rs. 170B", revenueGrowth:"6.6%", earningsGrowth:"5.0%", beta:"0.75", week52Note:"Largest urea producer — 10%+ yield backed by Fauji Group stability" },
  EFERT:  { name:"Engro Fertilisers Ltd", sector:"Fertiliser", industry:"Chemicals", pe:"9.6", pb:"3.2", eps:"29.20", divYield:"8.6%", roe:"33.2%", roa:"18.8%", grossMargin:"39.2%", netMargin:"25.2%", opMargin:"33.0%", ebitda:"Rs. 44B", revenue:"Rs. 176B", currentRatio:"2.28", debtToEquity:"0.41", totalDebt:"Rs. 8.2B", totalCash:"Rs. 13B", fcf:"Rs. 33B", marketCap:"Rs. 152B", revenueGrowth:"12.8%", earningsGrowth:"10.4%", beta:"0.81", week52Note:"Enven plant is world-class — gas curtailment is the primary risk" },
  LUCK:   { name:"Lucky Cement Ltd", sector:"Cement", industry:"Building Materials", pe:"13.8", pb:"1.8", eps:"64.40", divYield:"3.9%", roe:"12.8%", roa:"6.6%", grossMargin:"18.8%", netMargin:"11.0%", opMargin:"14.6%", ebitda:"Rs. 29B", revenue:"Rs. 270B", currentRatio:"1.64", debtToEquity:"0.46", totalDebt:"Rs. 19B", totalCash:"Rs. 13B", fcf:"Rs. 13B", marketCap:"Rs. 220B", revenueGrowth:"5.0%", earningsGrowth:"2.6%", beta:"1.11", week52Note:"Best quality cement — Iraq and DRC international operations unique on PSX" },
  MLCF:   { name:"Maple Leaf Cement", sector:"Cement", industry:"Building Materials", pe:"18.0", pb:"1.6", eps:"4.90", divYield:"2.5%", roe:"8.8%", roa:"4.3%", grossMargin:"14.4%", netMargin:"6.5%", opMargin:"11.0%", ebitda:"Rs. 8.6B", revenue:"Rs. 54B", currentRatio:"1.30", debtToEquity:"0.80", totalDebt:"Rs. 8.8B", totalCash:"Rs. 2.9B", fcf:"Rs. 2.5B", marketCap:"Rs. 25B", revenueGrowth:"6.4%", earningsGrowth:"-8.6%", beta:"1.23", week52Note:"Rate cut beneficiary — leveraged play on construction recovery" },
  CHCC:   { name:"Cherat Cement Co.", sector:"Cement", industry:"Building Materials", pe:"22.0", pb:"2.4", eps:"8.40", divYield:"1.9%", roe:"11.0%", roa:"5.5%", grossMargin:"17.0%", netMargin:"8.4%", opMargin:"12.6%", ebitda:"Rs. 7.0B", revenue:"Rs. 43B", currentRatio:"1.50", debtToEquity:"0.60", totalDebt:"Rs. 6.4B", totalCash:"Rs. 2.5B", fcf:"Rs. 1.9B", marketCap:"Rs. 29B", revenueGrowth:"8.6%", earningsGrowth:"-4.4%", beta:"1.17", week52Note:"Mid-size cement with solid dividend — single plant is concentration risk" },
  DGKC:   { name:"D.G. Khan Cement", sector:"Cement", industry:"Building Materials", pe:"N/A", pb:"0.8", eps:"-4.80", divYield:"N/A", roe:"-4.4%", roa:"-2.2%", grossMargin:"6.6%", netMargin:"-3.5%", opMargin:"-2.9%", ebitda:"Rs. -1.7B", revenue:"Rs. 50B", currentRatio:"0.91", debtToEquity:"1.88", totalDebt:"Rs. 19B", totalCash:"Rs. 1.9B", fcf:"Rs. -2.9B", marketCap:"Rs. 19B", revenueGrowth:"-2.6%", earningsGrowth:"-29%", beta:"1.31", week52Note:"Nishat Group quality at distressed price — debt paydown is the story" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fetchJSON(url, ms = 5000) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(null), ms);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0', 'Accept': 'application/json' } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    }).on('error', () => { clearTimeout(t); resolve(null); });
  });
}

function fetchRSS(url, source, ms = 4000) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve([]), ms);
    https.get(url, { headers: { 'User-Agent': 'WallTrade/1.0', 'Accept': 'application/rss+xml,text/xml' } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        clearTimeout(t);
        try {
          const items = b.match(/<item>([\s\S]*?)<\/item>/gi) || [];
          const articles = items.slice(0, 6).map(item => {
            const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || item.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
            const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/i) || [])[1] || '';
            return { title: title.trim().replace(/&amp;/g,'&').replace(/&#39;/g,"'"), source, pubDate, date: pubDate ? new Date(pubDate).getTime() : 0 };
          }).filter(a => a.title);
          resolve(articles);
        } catch { resolve([]); }
      });
    }).on('error', () => { clearTimeout(t); resolve([]); });
  });
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const hardTimeout = setTimeout(() => reject(new Error('Anthropic timeout')), 22000);
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

// ─────────────────────────────────────────────────────────────────────────────
// GET STOCK DATA — price passed from frontend, fundamentals from DB
// ─────────────────────────────────────────────────────────────────────────────
function getStockData(ticker, livePrice) {
  const fb = FUNDAMENTALS[ticker];
  if (!fb) return null;
  return {
    ticker,
    name: fb.name, sector: fb.sector, industry: fb.industry,
    price:      livePrice?.price     || null,
    change:     livePrice?.change    || null,
    dir:        livePrice?.dir       || 'up',
    high:       livePrice?.high      || null,
    low:        livePrice?.low       || null,
    volume:     livePrice?.volume    || null,
    week52High: livePrice?.week52High || null,
    week52Low:  livePrice?.week52Low  || null,
    pe: fb.pe, pb: fb.pb, eps: fb.eps, divYield: fb.divYield,
    roe: fb.roe, roa: fb.roa, grossMargin: fb.grossMargin,
    netMargin: fb.netMargin, opMargin: fb.opMargin,
    ebitda: fb.ebitda, revenue: fb.revenue,
    currentRatio: fb.currentRatio, debtToEquity: fb.debtToEquity,
    totalDebt: fb.totalDebt, totalCash: fb.totalCash,
    fcf: fb.fcf, marketCap: fb.marketCap,
    revenueGrowth: fb.revenueGrowth, earningsGrowth: fb.earningsGrowth,
    beta: fb.beta,
    casaRatio:  fb.casaRatio  || null,
    nplRatio:   fb.nplRatio   || null,
    week52Note: fb.week52Note || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE MACRO FETCHER — oil, gold, PKR, DXY, KSE-100, sector news
// ─────────────────────────────────────────────────────────────────────────────
async function fetchLiveMacro(ticker) {
  const fmpKey = process.env.FMP_API_KEY;
  const macro  = { oil: null, gold: null, pkrusd: null, dxy: null, kse100: null, sp500: null, news: [] };

  const chartChange = (r) => {
    const closes = r?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 2) return null;
    const cur = closes[closes.length - 1], prev = closes[closes.length - 2];
    return { price: cur.toFixed(2), change: ((cur - prev) / prev * 100).toFixed(2) };
  };

  const [oilR, goldR, dxyR, kseR, pkrR, sp500R] = await Promise.all([
    fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=2d'),
    fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=2d'),
    fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=2d'),
    fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d'),
    fmpKey ? fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${fmpKey}`) : Promise.resolve(null),
    fmpKey ? fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=%5EGSPC&apikey=${fmpKey}`) : Promise.resolve(null),
  ]);

  const oil = chartChange(oilR);   if (oil)  macro.oil    = { ...oil,  label: 'Brent Crude (USD/bbl)' };
  const gold = chartChange(goldR); if (gold) macro.gold   = { price: Math.round(parseFloat(gold.price)).toString(), change: gold.change, label: 'Gold (USD/oz)' };
  const dxy = chartChange(dxyR);   if (dxy)  macro.dxy    = { ...dxy,  label: 'USD Index (DXY)' };
  const kse = chartChange(kseR);   if (kse)  macro.kse100 = { price: Math.round(parseFloat(kse.price)).toLocaleString(), change: kse.change, label: 'KSE-100 Index' };

  const pkrArr = Array.isArray(pkrR) ? pkrR : null;
  if (pkrArr?.[0]?.price) macro.pkrusd = { rate: parseFloat(pkrArr[0].price).toFixed(2), label: 'PKR per USD' };

  const sp = Array.isArray(sp500R) ? sp500R[0] : null;
  if (sp?.price) macro.sp500 = { price: sp.price.toFixed(2), change: (sp.changesPercentage || 0).toFixed(2) };

  // Sector-relevant Pakistan financial news
  const SECTOR_KEYWORDS = {
    'Energy':      ['oil','brent','crude','ogdc','ppl','pso','mari','energy','petroleum','circular debt','omc'],
    'Banking':     ['bank','hbl','mcb','ubl','nbp','abl','bafl','interest rate','sbp','npl','casa','nim'],
    'Fertiliser':  ['fertiliser','fertilizer','urea','engro','engroh','efert','ffc','gas','agriculture'],
    'Cement':      ['cement','luck','mlcf','chcc','dgkc','construction','cpec','psdp','coal'],
    'Conglomerate':['engro','engroh','lng','fertiliser','polymer','diversified'],
  };
  const fb = FUNDAMENTALS[ticker];
  const sectorKeys = SECTOR_KEYWORDS[fb?.sector] || [];
  const allKeys = [...new Set([...sectorKeys, 'psx','kse','imf','pakistan economy','sbp','rupee','pkr','inflation','dollar','budget','fiscal','monetary'])];

  try {
    const feeds = [
      { url: 'https://www.brecorder.com/feeds/rss',        source: 'Business Recorder' },
      { url: 'https://www.dawn.com/feeds/business-finance', source: 'Dawn Business' },
      { url: 'https://tribune.com.pk/feed/business',       source: 'Tribune Business' },
      { url: 'https://www.thenews.com.pk/rss/2/29',        source: 'The News Business' },
    ];
    const rssResults = await Promise.allSettled(feeds.map(f => fetchRSS(f.url, f.source, 4000)));
    const cutoff = Date.now() - (48 * 60 * 60 * 1000);
    const all = rssResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    macro.news = all
      .filter(a => !a.date || a.date >= cutoff)
      .map(a => ({ ...a, score: allKeys.filter(k => a.title.toLowerCase().includes(k)).length }))
      .filter(a => a.score > 0)
      .sort((a, b) => b.date - a.date || b.score - a.score)
      .slice(0, 6);
  } catch(e) {}

  return macro;
}

// ─────────────────────────────────────────────────────────────────────────────
// DCF — simplified dividend discount model, Pakistan-calibrated
// ─────────────────────────────────────────────────────────────────────────────
function computeDCF(s, livePrice) {
  try {
    const eps   = parseFloat(s.eps);
    const price = parseFloat(livePrice?.price || 0);
    if (!eps || eps <= 0 || !price || price <= 0) return null;

    const PARAMS = {
      'Energy':      { g1: 0.06, g2: 0.04, gT: 0.03, r: 0.14 },
      'Banking':     { g1: 0.12, g2: 0.08, gT: 0.04, r: 0.15 },
      'Fertiliser':  { g1: 0.07, g2: 0.05, gT: 0.03, r: 0.14 },
      'Cement':      { g1: 0.08, g2: 0.05, gT: 0.03, r: 0.15 },
      'Conglomerate':{ g1: 0.08, g2: 0.05, gT: 0.03, r: 0.14 },
    };
    const p = PARAMS[s.sector] || { g1: 0.07, g2: 0.05, gT: 0.03, r: 0.15 };
    const payout = s.sector === 'Banking' ? 0.60 : 0.70;

    let pv = 0, curEPS = eps;
    for (let yr = 1; yr <= 10; yr++) {
      curEPS *= (1 + (yr <= 5 ? p.g1 : p.g2));
      pv += (curEPS * payout) / Math.pow(1 + p.r, yr);
    }
    const tv  = (curEPS * (1 + p.gT) * payout) / (p.r - p.gT);
    const pvTV = tv / Math.pow(1 + p.r, 10);
    const iv   = pv + pvTV;
    const upside = ((iv - price) / price * 100).toFixed(1);

    return {
      intrinsicValue: iv.toFixed(2),
      currentPrice:   price.toFixed(2),
      upside:         upside + '%',
      marginOfSafety: ((iv - price) / iv * 100).toFixed(1) + '%',
      dcfVerdict:     parseFloat(upside) > 20 ? 'Undervalued' : parseFloat(upside) < -20 ? 'Overvalued' : 'Fair Value',
      assumptions:    `Discount rate ${(p.r*100).toFixed(0)}% | Growth: ${(p.g1*100).toFixed(0)}% → ${(p.g2*100).toFixed(0)}% → ${(p.gT*100).toFixed(0)}% terminal | Payout ${(payout*100).toFixed(0)}%`,
    };
  } catch(e) { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERDICT CACHE
// ─────────────────────────────────────────────────────────────────────────────
const verdictCache = {};
const CACHE_TTL    = 4 * 60 * 60 * 1000; // 4 hours

function getCached(ticker) {
  const c = verdictCache[ticker];
  if (!c || Date.now() - c.ts > CACHE_TTL) { delete verdictCache[ticker]; return null; }
  return c.data;
}
function setCache(ticker, data) { verdictCache[ticker] = { data, ts: Date.now() }; }

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE VERDICT — full macro + news + DCF intelligence
// ─────────────────────────────────────────────────────────────────────────────
async function generateVerdict(s, livePrice, macroCtx) {
  const cached = getCached(s.ticker);
  if (cached) return { ...cached, cached: true };

  const today = new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const bankNote = s.casaRatio
    ? `\nBANKING METRICS:\n• CASA Ratio: ${s.casaRatio} | NPL Ratio: ${s.nplRatio}\n• NOTE: D/E of ${s.debtToEquity} is deposit-funded — completely normal for banks. Judge on CASA, NPL, ROE, NIM instead.`
    : '';

  const prompt = `You are a senior equity analyst at a top-tier investment bank. Today is ${today}. Produce a complete research verdict on ${s.ticker}.

═══ SECTION 1 — LIVE MARKET INTELLIGENCE ═══
${macroCtx}

═══ SECTION 2 — COMPANY FUNDAMENTALS (FY2025) ═══
${s.name} | ${s.sector} | ${s.industry}
Price: PKR ${s.price || 'unavailable'} (${s.change || '??'}% today) | Vol: ${s.volume || 'N/A'}
52W Range: PKR ${s.week52Low || '?'} – ${s.week52High || '?'}

VALUATION: P/E ${s.pe}x | P/B ${s.pb}x | EPS PKR ${s.eps} | Div Yield ${s.divYield}
PROFITABILITY: ROE ${s.roe} | ROA ${s.roa} | Gross Margin ${s.grossMargin} | Net Margin ${s.netMargin} | Op Margin ${s.opMargin}
FINANCIALS: Current Ratio ${s.currentRatio} | D/E ${s.debtToEquity} | FCF ${s.fcf} | Cash ${s.totalCash} | Debt ${s.totalDebt}
SCALE: Revenue ${s.revenue} | EBITDA ${s.ebitda} | Market Cap ${s.marketCap}
GROWTH: Revenue ${s.revenueGrowth} | Earnings ${s.earningsGrowth} | Beta ${s.beta}${bankNote}
ANALYST NOTE: ${s.week52Note}

═══ ANALYST REQUIREMENTS ═══
1. Use the REAL numbers above — no generalisations
2. Connect today's oil/PKR/rates to this specific company's margins and revenues
3. Reference any news headlines that move the needle for this stock
4. Use the DCF signal to comment on valuation
5. Give a clear, opinionated verdict — no fence-sitting

Return ONLY valid JSON:
{
  "verdict": "Positive" or "Neutral" or "Caution",
  "score": <1-10>,
  "headline": "<verdict>: <sharp conviction statement max 14 words>",
  "body": "<180-220 words. Para 1: verdict + 2 strongest drivers with real numbers. Para 2: macro linkage — today oil/PKR/rates and how they affect THIS stock specifically, reference any relevant news. Para 3: valuation — multiples vs sector + DCF direction. Final sentence: the one risk that could change the thesis. No jargon. No buy/sell advice.>",
  "insights": [
    {"icon":"<emoji>","value":"<metric + number>","label":"<plain English meaning max 10 words>","color":"green"},
    {"icon":"<emoji>","value":"<metric + number>","label":"<plain English meaning max 10 words>","color":"green"},
    {"icon":"<emoji>","value":"<risk or concern>","label":"<plain English meaning max 10 words>","color":"amber"}
  ],
  "signals": [
    {"label":"<2-4 word signal>","type":"green"},
    {"label":"<2-4 word signal>","type":"amber"},
    {"label":"<2-4 word signal>","type":"purple"},
    {"label":"<2-4 word signal>","type":"green"}
  ],
  "scores": { "Financial health":<1-10>, "Macro environment":<1-10>, "Growth outlook":<1-10>, "Risk level":<1-10> },
  "factors": [
    {"icon":"<emoji>","title":"<max 6 words>","detail":"<3 sentences, specific numbers, Pakistan cause-effect, plain English>"},
    {"icon":"<emoji>","title":"<max 6 words>","detail":"<3 sentences, specific numbers, Pakistan cause-effect, plain English>"},
    {"icon":"<emoji>","title":"<max 6 words>","detail":"<3 sentences, specific numbers, Pakistan cause-effect, plain English>"}
  ],
  "summary": "<one sharp conviction sentence>"
}`;

  try {
    const result = await callAnthropic({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1600,
      system: 'You are a senior PSX equity analyst at a tier-1 investment bank. Always use the actual numbers from the data. Connect macro to stock-level impact with precision. Take a clear stance. Return only valid JSON.',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = result.content?.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON in response');
    const verdict = JSON.parse(m[0]);
    setCache(s.ticker, verdict);
    console.log(`[stock] ${s.ticker}: ${verdict.verdict} ${verdict.score}/10`);
    return verdict;
  } catch(e) {
    console.error('[stock] AI error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
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
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { ticker, livePrice } = payload;
  if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid ticker' }) };
  }

  const t = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  console.log(`[stock] ${t} | price: ${livePrice?.price || 'none'}`);

  const stockData = getStockData(t, livePrice || null);
  if (!stockData) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: `${t} not in coverage. Try: OGDC, PPL, PSO, MARI, HBL, MCB, UBL, NBP, ABL, BAFL, ENGROH, FFC, EFERT, LUCK, MLCF, CHCC, DGKC, APL, HASCOL` }) };
  }

  // Fetch live macro + run DCF in parallel, cap at 6s
  const [liveMacro] = await Promise.all([
    Promise.race([fetchLiveMacro(t), new Promise(r => setTimeout(() => r({}), 6000))])
  ]);

  const dcf = computeDCF(stockData, livePrice);
  const today = new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Build macro context string
  let macroCtx = `LIVE MARKET DATA (${today}):\n`;
  if (liveMacro.oil)    macroCtx += `• Brent Crude: $${liveMacro.oil.price}/bbl (${Number(liveMacro.oil.change)>=0?'+':''}${liveMacro.oil.change}%) — impacts Pakistan current account, OMC margins, E&P revenues\n`;
  if (liveMacro.gold)   macroCtx += `• Gold: $${liveMacro.gold.price}/oz (${Number(liveMacro.gold.change)>=0?'+':''}${liveMacro.gold.change}%) — global risk sentiment\n`;
  if (liveMacro.pkrusd) macroCtx += `• PKR/USD: ${liveMacro.pkrusd.rate} — affects import costs, dollar-linked revenues, inflation\n`;
  if (liveMacro.dxy)    macroCtx += `• USD Index (DXY): ${liveMacro.dxy.price} (${Number(liveMacro.dxy.change)>=0?'+':''}${liveMacro.dxy.change}%) — stronger DXY pressures PKR\n`;
  if (liveMacro.kse100) macroCtx += `• KSE-100: ${liveMacro.kse100.price} pts (${Number(liveMacro.kse100.change)>=0?'UP':'DOWN'} ${Math.abs(liveMacro.kse100.change)}% today)\n`;
  if (liveMacro.sp500)  macroCtx += `• S&P 500: ${liveMacro.sp500.price} (${Number(liveMacro.sp500.change)>=0?'+':''}${liveMacro.sp500.change}%) — global risk-on/off\n`;

  macroCtx += `\nPAKISTAN MACRO:\n`;
  macroCtx += `• SBP Rate: 10.50% | Aggressive easing from 22% peak — 11 cuts since mid-2024\n`;
  macroCtx += `• IMF EFF: Active — energy reform, circular debt reduction, DISCO privatisation\n`;
  macroCtx += `• CPI: ~8-9% (down from 38% peak) | Current account: near-balanced\n`;
  macroCtx += `• Circular debt: Rs. 2.3tn+ power sector | KSE-100: near record highs\n`;

  if (liveMacro.news?.length) {
    macroCtx += `\nLATEST NEWS (factor these into analysis):\n`;
    liveMacro.news.forEach((n, i) => { macroCtx += `${i+1}. [${n.source}] ${n.title}\n`; });
  }

  if (dcf) {
    macroCtx += `\nDCF MODEL:\n`;
    macroCtx += `• Intrinsic Value: PKR ${dcf.intrinsicValue} | Current: PKR ${dcf.currentPrice}\n`;
    macroCtx += `• Implied Upside: ${dcf.upside} | Signal: ${dcf.dcfVerdict}\n`;
    macroCtx += `• Assumptions: ${dcf.assumptions}\n`;
  }

  const verdict = await generateVerdict(stockData, livePrice, macroCtx);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ stockData, verdict, dcf: dcf || null, timestamp: new Date().toISOString() })
  };
};
