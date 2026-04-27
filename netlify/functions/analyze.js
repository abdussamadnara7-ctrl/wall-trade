const https = require('https');
const http  = require('http');

// ── RATE LIMITING ──────────────────────────────────────────────
const rateLimitStore = {};
const RATE_LIMIT = 20;
const WINDOW_MS  = 60 * 60 * 1000;

function getRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitStore[ip] || now - rateLimitStore[ip].windowStart > WINDOW_MS) {
    rateLimitStore[ip] = { count: 0, windowStart: now };
  }
  return rateLimitStore[ip];
}

// ── SECTOR FRAMEWORKS ──────────────────────────────────────────
const SECTOR_FRAMEWORKS = {
  BANKING: {
    tickers: ['HBL','MCB','UBL','NBP','ABL','BAFL','BAHL','MEBL','FABL'],
    keyRatios: ['P/B','ROE','CASA','NPL Ratio','Cost-to-Income','CAR','Div Yield'],
    benchmarks: {
      pb:   { good:'<1.5',  warn:'1.5-2.5', bad:'>2.5',  note:'P/B is primary valuation metric for banks' },
      roe:  { good:'>18%',  warn:'12-18%',  bad:'<12%',  note:'ROE measures profitability of equity base' },
      casa: { good:'>75%',  warn:'60-75%',  bad:'<60%',  note:'CASA = low-cost deposits → higher margins' },
      npl:  { good:'<5%',   warn:'5-10%',   bad:'>10%',  note:'Higher NPL = credit risk' },
      car:  { good:'>15%',  warn:'12-15%',  bad:'<12%',  note:'Regulatory capital buffer' }
    },
    macroSensitivities: [
      'SBP policy rate changes directly impact bank margins (NIM)',
      'Rate cuts compress margins short-term but boost credit growth',
      'Government borrowing crowds out private lending',
      'PKR volatility affects trade finance and foreign operations'
    ],
    newsKeywords: ['sbp','interest rate','policy rate','banking','npl','deposits','credit','loan','nib','hbl','mcb','ubl','nbp','bafl','bahl','mebl','fabl','central bank','monetary','treasury bills'],
    ignoreRatios: ['currentRatio','quickRatio'],
    promptContext: `Pakistani commercial bank.
Primary valuation: P/B + ROE. P/E is secondary.
High CASA = strong deposit franchise.
High NPL = asset quality risk.
D/E appears high due to deposits — this is NORMAL for banks, do NOT flag it as risky.
Focus on: ROE, CASA, NPL, capital strength, and rate cycle direction.`
  },

  ENERGY_EP: {
    tickers: ['OGDC','PPL','MARI'],
    keyRatios: ['P/E','Div Yield','Net Margin','ROE'],
    benchmarks: {
      pe:        { good:'<10',  warn:'10-15', bad:'>15',  note:'E&P trades at discount due to Pakistan risk premium' },
      divYield:  { good:'>6%',  warn:'4-6%',  bad:'<4%',  note:'Income investors prioritise high yield in E&P' },
      netMargin: { good:'>35%', warn:'20-35%',bad:'<20%', note:'High margin sector structurally — below 20% signals issues' }
    },
    macroSensitivities: [
      'Oil (Brent) price directly drives earnings — every $10/bbl move matters',
      'PKR depreciation BOOSTS rupee revenues (wellhead prices are USD-linked)',
      'Circular debt delays cash flows despite strong reported earnings',
      'GoP pricing decisions and OGRA wellhead tariffs impact realisations'
    ],
    newsKeywords: ['oil','brent','crude','petroleum','ogdc','ppl','mari','e&p','exploration','wellhead','ogra','circular debt','energy','gas field','opec','iran','strait','hormuz'],
    promptContext: `Pakistani E&P (exploration & production) company.
Revenue is USD-linked → PKR weakness is POSITIVE for earnings in rupee terms.
Brent crude price is the single biggest earnings driver — always reference it.
Circular debt is a structural issue — earnings ≠ cash flow for PSX E&P companies.
Focus on: net margin, dividend yield sustainability, FCF vs reported profit.
Do NOT penalise for high D/E unless debt is truly excessive (E&P capex is normal).`
  },

  OMC: {
    tickers: ['PSO','APL','HASCOL'],
    keyRatios: ['P/E','P/B','Net Margin','D/E'],
    benchmarks: {
      netMargin: { good:'>3%', warn:'1-3%', bad:'<1%', note:'OMC margins are structurally thin — 1-3% is normal' },
      de:        { good:'<1',  warn:'1-2',  bad:'>2',  note:'High leverage is risky given working capital cycle' }
    },
    macroSensitivities: [
      'PKR depreciation increases import costs → margin pressure',
      'Oil price volatility creates inventory gains/losses (key quarterly swing factor)',
      'Circular debt → receivables stress, especially for PSO',
      'Interest rates impact financing cost of large working capital'
    ],
    newsKeywords: ['pso','petrol','diesel','fuel','petroleum levy','circular debt','omc','oil price','pump price','petroleum','hascol','apl','attock'],
    promptContext: `Oil Marketing Company (OMC).
Low-margin, high-volume business — thin margins are normal, not a red flag.
Key risk is receivables and working capital quality, NOT top-line revenue.
PKR weakness is NEGATIVE (imports priced in USD, revenues in PKR).
Inventory gains/losses are a major driver of quarterly earnings swings.
PSO carries significant GoP receivables risk — treat as a special case.`
  },

  FERTILISER: {
    tickers: ['EFERT','FFC','FFBL'],
    keyRatios: ['P/E','Div Yield','ROE','Net Margin'],
    benchmarks: {
      divYield: { good:'>8%', warn:'5-8%', bad:'<5%', note:'Fertiliser stocks are core income plays on PSX' },
      roe:      { good:'>25%',warn:'15-25%',bad:'<15%',note:'High ROE reflects pricing power and gas cost advantage' }
    },
    macroSensitivities: [
      'Gas feedstock cost is the single biggest input — SSGC/SNGC allocation is critical',
      'Government gas pricing and allocation policy directly impacts margins',
      'Seasonal demand: high in Oct-Dec (rabi) and Feb-Apr (kharif)',
      'International urea prices set floor for domestic pricing'
    ],
    newsKeywords: ['fertiliser','urea','feedstock','ssgc','sngc','efert','ffc','ffbl','gas allocation','urea price','dap','rabi','kharif','crop','agriculture','subsidy'],
    promptContext: `Pakistani fertiliser company.
Gas feedstock cost = the core profitability variable. Track it closely.
High dividend yield is the primary investment case for most investors.
Demand is seasonal — factor in rabi/kharif cycle when interpreting volumes.
FFC and EFERT have strong balance sheets. FFBL is loss-making with weak financials.
Do NOT compare to industrial companies — this is a gas-to-urea conversion business.`
  },

  CEMENT: {
    tickers: ['LUCK','MLCF','CHCC','DGKC'],
    keyRatios: ['P/E','D/E','Net Margin','ROE'],
    benchmarks: {
      de:        { good:'<1',  warn:'1-2',  bad:'>2',  note:'High leverage is risky in cyclical cement downturns' },
      netMargin: { good:'>12%',warn:'6-12%',bad:'<6%', note:'Margins highly sensitive to coal price and volumes' }
    },
    macroSensitivities: [
      'PSDP (Public Sector Development Programme) spending is the demand driver',
      'Interest rate cuts boost private construction and real estate demand',
      'Coal (imported, USD-priced) is major cost — PKR depreciation hurts margins',
      'Industry overcapacity leads to retention price pressure'
    ],
    newsKeywords: ['cement','psdp','construction','coal','luck','mlcf','chcc','dgkc','real estate','retention price','housing','infrastructure','building','capacity'],
    promptContext: `Pakistani cement company.
Highly cyclical — demand driven by PSDP and private construction activity.
Coal cost (USD-denominated) is key margin driver — PKR weakness HURTS margins.
Industry is in structural overcapacity — watch retention prices per bag.
LUCK has export exposure and premium brand — different risk/return vs peers.
Rate cuts are a clear positive — they stimulate construction and housing.`
  },

  TECH: {
    tickers: ['SYS','TRG','NETSOL'],
    keyRatios: ['P/E','ROE','Net Margin','Revenue Growth'],
    benchmarks: {
      growth: { good:'>15%', warn:'8-15%', bad:'<8%', note:'Revenue growth is primary valuation driver for tech' },
      margin: { good:'>15%', warn:'10-15%',bad:'<10%',note:'Higher net margin = quality, scalable tech business' }
    },
    macroSensitivities: [
      'PKR depreciation BOOSTS rupee earnings (dollar-revenue companies)',
      'US/global economic slowdown directly impacts IT services demand',
      'Dollar inflows support FX reserves — politically supported sector',
      'Client concentration risk — loss of key client = earnings cliff'
    ],
    newsKeywords: ['technology','it','software','sys','trg','netsol','exports','dollar','tech','it exports','freelancer','digital','outsourcing','pakistan software'],
    promptContext: `Pakistani IT/technology export company.
PKR depreciation = POSITIVE (revenues in USD, costs in PKR).
Growth rate and margin quality matter more than absolute size.
Low debt balance sheets should trade at a premium.
Focus on: export revenue growth, client diversification, margin trend.
SYS is the highest quality; TRG and NETSOL have more concentrated client risk.`
  },

  CONGLOMERATE: {
    tickers: ['ENGROH'],
    keyRatios: ['P/E','ROE','Div Yield'],
    benchmarks: {
      divYield: { good:'>5%', warn:'3-5%', bad:'<3%', note:'Holding companies valued on dividend income from subsidiaries' }
    },
    macroSensitivities: [
      'Performance driven by underlying subsidiaries (EFERT, energy assets, Enfrashare)',
      'Dividend income from EFERT is the biggest value driver',
      'Sum-of-parts valuation — discount to NAV is common for holding companies'
    ],
    newsKeywords: ['engroh','engro','efert','enfrashare','holding','subsidiary','dividend','conglomerate'],
    promptContext: `Engro Holdings Limited (ENGROH) — holding company listed Jan 2025, replacing ENGRO.
NOT a pure operating business — value comes from subsidiaries.
EFERT dividend income is the core cash flow driver.
Analyse using sum-of-parts logic, not standalone P&L.
Discount to NAV is normal and expected for holding companies.
Do NOT analyse like a single-sector industrial company.`
  }
};

// ── SECTOR LOOKUP ──────────────────────────────────────────────
function getSectorFramework(ticker) {
  for (const [code, fw] of Object.entries(SECTOR_FRAMEWORKS)) {
    if (fw.tickers.includes(ticker)) return { code, ...fw };
  }
  return null; // no framework = general analysis
}

// ── SECTOR-FILTERED NEWS ───────────────────────────────────────
function filterNewsForSector(news, framework) {
  if (!news?.length || !framework?.newsKeywords) return news || [];
  const keywords = framework.newsKeywords;

  // Score each article: sector-relevant keywords score higher
  const scored = news.map(n => {
    const text = ((n.title || '') + ' ' + (n.description || '')).toLowerCase();
    const score = keywords.filter(k => text.includes(k)).length;
    return { ...n, sectorScore: score };
  });

  // Sort: sector-specific news first, then general Pakistan business news
  return scored.sort((a, b) => b.sectorScore - a.sectorScore || b.date - a.date);
}

// ── BUILD SECTOR-AWARE STOCK CONTEXT ──────────────────────────
function buildStockContext(ticker, stockData, framework) {
  if (!stockData) return '';

  const ignore = framework?.ignoreRatios || [];

  // Build ratio lines — skip ratios the sector says are irrelevant
  const ratioLines = [];

  if (!ignore.includes('pe') && stockData.pe !== 'N/A')
    ratioLines.push(`P/E: ${stockData.pe}x`);
  if (!ignore.includes('pb') && stockData.pb !== 'N/A')
    ratioLines.push(`P/B: ${stockData.pb}x`);
  if (stockData.ev_ebitda && stockData.ev_ebitda !== 'N/A')
    ratioLines.push(`EV/EBITDA: ${stockData.ev_ebitda}x`);
  if (stockData.eps && stockData.eps !== 'N/A')
    ratioLines.push(`EPS: PKR ${stockData.eps}`);
  if (stockData.divYield && stockData.divYield !== 'N/A')
    ratioLines.push(`Div Yield: ${stockData.divYield}`);
  if (stockData.roe && stockData.roe !== 'N/A')
    ratioLines.push(`ROE: ${stockData.roe}`);
  if (stockData.roa && stockData.roa !== 'N/A')
    ratioLines.push(`ROA: ${stockData.roa}`);
  if (stockData.netMargin && stockData.netMargin !== 'N/A')
    ratioLines.push(`Net Margin: ${stockData.netMargin}`);
  if (stockData.grossMargin && stockData.grossMargin !== 'N/A')
    ratioLines.push(`Gross Margin: ${stockData.grossMargin}`);
  if (stockData.ebitdaMargin && stockData.ebitdaMargin !== 'N/A')
    ratioLines.push(`EBITDA Margin: ${stockData.ebitdaMargin}`);
  if (!ignore.includes('currentRatio') && stockData.currentRatio !== 'N/A')
    ratioLines.push(`Current Ratio: ${stockData.currentRatio}`);
  if (!ignore.includes('quickRatio') && stockData.quickRatio !== 'N/A')
    ratioLines.push(`Quick Ratio: ${stockData.quickRatio}`);
  if (stockData.debtToEquity && stockData.debtToEquity !== 'N/A')
    ratioLines.push(`D/E: ${stockData.debtToEquity}${framework?.code === 'BANKING' ? ' (NORMAL for banks — do not flag)' : ''}`);
  if (stockData.interestCover && stockData.interestCover !== 'N/A')
    ratioLines.push(`Interest Cover: ${stockData.interestCover}x`);
  if (stockData.fcfYield && stockData.fcfYield !== 'N/A')
    ratioLines.push(`FCF Yield: ${stockData.fcfYield}`);

  let ctx = `LIVE STOCK DATA — ${ticker}:
Price: PKR ${stockData.price} (${stockData.change}% today) | 52W Range: ${stockData.yearLow} – ${stockData.yearHigh}
${ratioLines.join(' | ')}`;

  // Add sector context block
  if (framework) {
    ctx += `\n\nSECTOR: ${framework.code}
SECTOR RULES FOR THIS ANALYSIS:
${framework.promptContext}

KEY MACRO SENSITIVITIES FOR THIS SECTOR:
${framework.macroSensitivities.map(s => `• ${s}`).join('\n')}

VALUATION BENCHMARKS FOR THIS SECTOR:
${Object.entries(framework.benchmarks || {}).map(([k, b]) =>
  `• ${k.toUpperCase()}: Good=${b.good} | Caution=${b.warn} | Weak=${b.bad} — ${b.note}`
).join('\n')}`;
  }

  return ctx;
}

// ── HTTP FETCH ─────────────────────────────────────────────────
function fetchXML(url, source, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve([]), timeoutMs);
    try {
      lib.get(url, { headers: { 'User-Agent': 'WallTrade/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          clearTimeout(timer);
          try {
            const articles = [];
            // Parse RSS items with regex (no XML parser needed)
            const items = body.match(/<item>([\s\S]*?)<\/item>/gi) || [];
            items.slice(0, 10).forEach(item => {
              const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || item.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
              const desc  = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || item.match(/<description>(.*?)<\/description>/i) || [])[1] || '';
              const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/i) || [])[1] || '';
              if (title.trim()) {
                articles.push({
                  title: title.trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"'),
                  description: desc.replace(/<[^>]*>/g,'').trim().slice(0,200).replace(/&amp;/g,'&').replace(/&#39;/g,"'"),
                  publishedAt: pubDate.trim(),
                  date: pubDate ? new Date(pubDate).getTime() : 0,
                  source
                });
              }
            });
            resolve(articles);
          } catch(e) { resolve([]); }
        });
      }).on('error', () => { clearTimeout(timer); resolve([]); });
    } catch(e) { clearTimeout(timer); resolve([]); }
  });
}

function fetchJSON(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      lib.get(url, { headers: { 'User-Agent': 'WallTrade/1.0' } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          clearTimeout(timer);
          try { resolve(JSON.parse(body)); }
          catch(e) { resolve(null); }
        });
      }).on('error', () => { clearTimeout(timer); resolve(null); });
    } catch(e) { clearTimeout(timer); resolve(null); }
  });
}

// ── LIVE MACRO DATA FETCHER ────────────────────────────────────
async function fetchLiveMacro() {
  const macro = {
    oil:      null,
    gold:     null,
    kse100:   null,
    pkrusd:   null,
    usdindex: null,
    news:     [],
    fetched:  new Date().toISOString()
  };

  try {
    // 1 — Oil price via Yahoo Finance (no key needed)
    const oilData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=2d');
    if (oilData?.chart?.result?.[0]) {
      const r = oilData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.oil = {
          price:  current.toFixed(2),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'Brent Crude (USD/bbl)'
        };
      }
    }
  } catch(e) {}

  try {
    // 2 — Gold price
    const goldData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d');
    if (goldData?.chart?.result?.[0]) {
      const r = goldData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.gold = {
          price:  current.toFixed(0),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'Gold (USD/oz)'
        };
      }
    }
  } catch(e) {}

  try {
    // 3 — KSE-100 index (live PSX market)
    const kseData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EKSE?interval=1d&range=2d');
    if (kseData?.chart?.result?.[0]) {
      const r = kseData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.kse100 = {
          price:  Math.round(current).toLocaleString(),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'KSE-100 Index'
        };
      }
    }
  } catch(e) {}

  try {
    // 4 — PKR/USD via FMP
    const fxData = await fetchJSON(`https://financialmodelingprep.com/stable/quote?symbol=USDPKR&apikey=${process.env.FMP_API_KEY}`);
    // FMP returns [{symbol:'USDPKR', price:278.50, ...}]
    const pkrRate = Array.isArray(fxData) ? fxData[0]?.price : fxData?.rates?.PKR;
    if (pkrRate) {
      macro.pkrusd = {
        rate:  parseFloat(pkrRate).toFixed(2),
        label: 'PKR per USD'
      };
    }
  } catch(e) {}

  try {
    // 5 — USD Index (DXY)
    const dxyData = await fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=2d');
    if (dxyData?.chart?.result?.[0]) {
      const r = dxyData.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (closes?.length >= 2) {
        const current = closes[closes.length - 1];
        const prev    = closes[closes.length - 2];
        macro.usdindex = {
          price:  current.toFixed(2),
          change: ((current - prev) / prev * 100).toFixed(2),
          label:  'USD Index (DXY)'
        };
      }
    }
  } catch(e) {}

  try {
    // 6 — Pakistan financial news via NewsData.io
    // Free tier: 200 requests/day, no IP blocking unlike RSS feeds
    const ndKey = process.env.NEWSDATA_API_KEY;
    if (ndKey) {
      const newsUrl = `https://newsdata.io/api/1/news?apikey=${ndKey}&country=pk&category=business&language=en&size=10`;
      const newsData = await fetchJSON(newsUrl, 6000);

      if (newsData?.results?.length) {
        const cutoff = Date.now() - (36 * 60 * 60 * 1000);
        const keywords = ['economy','psx','sbp','stock','rupee','pkr','oil','imf','budget',
          'inflation','interest rate','kse','market','investment','sector','energy','bank',
          'cement','fertiliser','engroh','ogdc','hbl','mcb','dollar','brent','gold','fed',
          'geopolit','iran','strait','hormuz','tariff','china','fiscal','monetary','karachi',
          'lahore','pakistan','exchange','rupee','rate','finance','shares','equit'];

        const scored = newsData.results
          .map(a => {
            const pubMs = a.pubDate ? new Date(a.pubDate).getTime() : 0;
            const text = ((a.title || '') + ' ' + (a.description || '')).toLowerCase();
            const score = keywords.filter(k => text.includes(k)).length;
            return {
              title:       a.title || '',
              source:      a.source_id || a.source_name || 'Pakistan News',
              description: (a.description || '').slice(0, 150),
              publishedAt: a.pubDate || '',
              date:        pubMs,
              score
            };
          })
          .filter(a => a.title && a.score > 0)
          .sort((a, b) => b.date - a.date);

        macro.news = scored.slice(0, 8);
      }
    }

    // Fallback to RSS if no NewsData key or no results
    if (!macro.news?.length) {
      const RSS_FEEDS = [
        { url: 'https://www.dawn.com/feeds/business-finance', source: 'Dawn Business' },
        { url: 'https://www.thenews.com.pk/rss/2/29',         source: 'The News Business' },
      ];
      const rssResults = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchXML(feed.url, feed.source, 5000))
      );
      const allArticles = [];
      rssResults.forEach(r => { if (r.status === 'fulfilled' && r.value) allArticles.push(...r.value); });

      const keywords = ['economy','psx','sbp','stock','rupee','pkr','oil','imf','budget',
        'inflation','interest rate','kse','market','investment','sector','energy','bank'];
      const cutoff = Date.now() - (36 * 60 * 60 * 1000);

      const scored = allArticles
        .filter(a => !a.date || a.date === 0 || a.date >= cutoff)
        .map(a => {
          const text = (a.title + ' ' + (a.description || '')).toLowerCase();
          const score = keywords.filter(k => text.includes(k)).length;
          return { ...a, score };
        })
        .filter(a => a.score > 0)
        .sort((a, b) => b.date - a.date || b.score - a.score);

      macro.news = scored.slice(0, 8).map(a => ({
        title: a.title, source: a.source,
        description: a.description?.slice(0, 150),
        publishedAt: a.publishedAt, date: a.date
      }));
    }
  } catch(e) {
    console.error('News fetch error:', e.message);
  }

  return macro;
}

// ── FORMAT MACRO CONTEXT FOR AI ────────────────────────────────
function buildMacroContext(live, staticMacro) {
  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let ctx = `=== REAL-TIME MARKET DATA (as of ${today}) ===\n\n`;

  // Live prices
  ctx += 'GLOBAL MARKETS (live):\n';
  if (live.oil)      ctx += `• Brent Crude: $${live.oil.price}/bbl (${live.oil.change > 0 ? '+' : ''}${live.oil.change}%)\n`;
  if (live.gold)     ctx += `• Gold: $${live.gold.price}/oz (${live.gold.change > 0 ? '+' : ''}${live.gold.change}%)\n`;
  if (live.pkrusd)   ctx += `• PKR/USD: ${live.pkrusd.rate}\n`;
  if (live.usdindex) ctx += `• USD Index (DXY): ${live.usdindex.price} (${live.usdindex.change > 0 ? '+' : ''}${live.usdindex.change}%)\n`;

  if (live.kse100) {
    const kseDir = parseFloat(live.kse100.change) >= 0 ? '▲' : '▼';
    const kseColor = parseFloat(live.kse100.change) >= 0 ? 'POSITIVE' : 'NEGATIVE';
    ctx += `• KSE-100 Index: ${live.kse100.price} pts (${kseDir} ${Math.abs(live.kse100.change)}% — market sentiment ${kseColor} today)\n`;
  }

  ctx += '\nPAKISTAN MONETARY POLICY (current):\n';
  ctx += '•'SBP Policy Rate: 11.50% p.a. — JUST HIKED by 100bps from 10.50%. Rate sensitive verdicts must reflect this immediately. Negative for banks NIM compression, negative for cement demand, negative for leveraged companies. Positive for PKR stability.'
  ctx += '• Overnight Reverse Repo (ceiling): 11.50% p.a.\n';
  ctx += '• Overnight Repo (floor): 9.50% p.a.\n';
  ctx += '• Trend: Aggressive easing cycle — cut from 22% peak (2023) to 10.50% (2026)\n';

  ctx += '\nPAKISTAN MACRO (current):\n';
  ctx += staticMacro + '\n';

  // News headlines
  if (live.news?.length) {
    ctx += '\n=== LATEST NEWS HEADLINES (last 24-48 hours) ===\n';
    live.news.forEach((n, i) => {
      ctx += `${i+1}. [${n.source}] ${n.title}\n`;
      if (n.description) ctx += `   ${n.description}\n`;
    });
    ctx += '\nIMPORTANT: Factor these latest developments into your analysis where relevant.\n';
  }

  return ctx;
}

// ── FMP LIVE STOCK DATA ────────────────────────────────────────
async function getLiveStockData(ticker) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const [quote, metrics, ratios] = await Promise.all([
      fetchJSON(`https://financialmodelingprep.com/api/v3/quote/${ticker}.KA?apikey=${key}`),
      fetchJSON(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}.KA?apikey=${key}`),
      fetchJSON(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}.KA?apikey=${key}`)
    ]);
    if (!quote?.[0]) return null;
    const q = quote[0], m = metrics?.[0] || {}, r = ratios?.[0] || {};
    const pct = v => v != null ? (v*100).toFixed(1)+'%' : 'N/A';
    const fmt = (v,d=2) => v != null ? Number(v).toFixed(d) : 'N/A';
    return {
      price: fmt(q.price), change: fmt(q.changesPercentage),
      yearHigh: fmt(q.yearHigh), yearLow: fmt(q.yearLow),
      pe: fmt(r.peRatioTTM), pb: fmt(r.priceToBookRatioTTM),
      ps: fmt(r.priceToSalesRatioTTM), ev_ebitda: fmt(m.enterpriseValueOverEBITDATTM),
      roe: pct(r.returnOnEquityTTM), roa: pct(r.returnOnAssetsTTM),
      roic: pct(m.roicTTM), grossMargin: pct(r.grossProfitMarginTTM),
      netMargin: pct(r.netProfitMarginTTM), ebitdaMargin: pct(r.ebitdaMarginTTM),
      debtToEquity: fmt(r.debtEquityRatioTTM), currentRatio: fmt(r.currentRatioTTM),
      quickRatio: fmt(r.quickRatioTTM), interestCover: fmt(m.interestCoverageTTM),
      divYield: pct(r.dividendYieldTTM), payoutRatio: pct(r.payoutRatioTTM),
      fcfYield: pct(m.freeCashFlowYieldTTM), eps: fmt(r.epsTTM)
    };
  } catch(e) { return null; }
}

// ── QUESTION CLASSIFIER ────────────────────────────────────────
function classifyQuestion(question, ticker) {
  const q = question.toLowerCase();
  const t = ticker.toLowerCase();
  const mentionsStock = new RegExp(`\\b(${t}|this stock|this company|its |their |here)\\b`).test(q);

  if (/\b(dcf|discounted cash flow|intrinsic value|fair value|target price|valuation|price target|worth|undervalued|overvalued|margin of safety|wacc|terminal value)\b/.test(q)) return 'modelling';
  if (/\b(imf|sbp|interest rate|inflation|rupee|pkr|circular debt|psdp|cpec|budget|fiscal|monetary|current account|forex|dollar|economy|pakistan|policy rate|devaluation|iran|war|geopolit|oil supply|fed rate|federal reserve)\b/.test(q) && !mentionsStock) return 'macro';
  if (/\b(compare|vs|versus|better than|worse than|sector|industry|peers|benchmark|relative)\b/.test(q)) return 'comparison';
  if (/\b(risk|downside|worst case|danger|concern|worry|threat|problem|issue|challenge|bearish|negative)\b/.test(q) && mentionsStock) return 'risk';
  if (mentionsStock) return 'stock_specific';

  // Default: any general question without stock reference = educational
  return 'educational';
}

// ── ANTHROPIC CALL ─────────────────────────────────────────────
function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', chunk => { b += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── BUILD AI PROMPT (SECTOR-AWARE) ────────────────────────────
function buildPrompt(type, ticker, stockData, macroContext, safeQuestion, questionType, framework, sectorNews) {
  const stockCtx = buildStockContext(ticker, stockData, framework);

  // Filter and format sector-relevant news
  const relevantNews = filterNewsForSector(sectorNews, framework).slice(0, 5);
  const newsBlock = relevantNews.length
    ? `\nSECTOR-RELEVANT NEWS (most recent first):\n` +
      relevantNews.map((n, i) =>
        `${i+1}. [${n.source}] ${n.title}${n.description ? '\n   ' + n.description : ''}`
      ).join('\n') +
      '\nFactor these into your analysis where directly relevant.\n'
    : '';

  if (type === 'verdict') {
    return `${macroContext}

${stockCtx}
${newsBlock}
INSTRUCTION: Generate a sector-aware verdict for ${ticker}.
Follow the SECTOR RULES above precisely.
Use the VALUATION BENCHMARKS to calibrate your assessment.
Reference today's live macro (oil price, PKR, SBP rate, news) where relevant to this sector.

Return ONLY this JSON (no markdown):
{
  "headline": "One razor-sharp sentence, max 12 words. Sector-specific, specific numbers, analyst confidence.",
  "body": "3-4 sentences of genuine analysis. Weave sector rules + live financials + today's macro + news. Be specific with numbers. State clearly: Positive, Neutral, or Caution and why."
}`;
  }

  const base = `${macroContext}\n\n${stockCtx}${newsBlock}`;
  const sectorHint = framework
    ? `\nRemember: ${ticker} is a ${framework.code} — apply sector-specific logic in your answer.`
    : '';

  switch(questionType) {
    case 'modelling':
      return `${base}\n\nA retail investor asks about ${ticker}: "${safeQuestion}"\n${sectorHint}\nExplain valuation simply using the sector-appropriate multiples (${framework?.keyRatios?.join(', ') || 'P/E, P/B'}). Walk through what the numbers say about cheap vs expensive. Explain Pakistan-specific risks. No jargon. Mobile-friendly short paragraphs. No buy/sell advice.`;

    case 'macro':
      return `${macroContext}\n\nInvestor asks: "${safeQuestion}"\n\nAnswer as a macro analyst using LIVE DATA above. Which PSX sectors and stocks win or lose from this? Be specific — name companies. 4-5 sentences.`;

    case 'educational':
      return `${macroContext}\n\nRetail investor asks: "${safeQuestion}"\n\nClear educational answer. Use Pakistani market examples (PSX, SBP, PKR, specific sectors). Reference live market context where relevant. No jargon. 3-5 sentences.`;

    case 'comparison':
      return `${base}\n\nInvestor asks: "${safeQuestion}"\n${sectorHint}\nDirect comparative perspective using live data. Be clear about which is stronger and why. 4-5 sentences.`;

    case 'risk':
      return `${base}\n\nInvestor asks about risk in ${ticker}: "${safeQuestion}"\n${sectorHint}\nLayered risk assessment using today's live data — balance sheet, Pakistan macro, sector-specific risks, geopolitical. Probability-weight which are existential vs manageable. 4-6 sentences.`;

    default:
      return `${base}\n\nInvestor asks about ${ticker}: "${safeQuestion}"\n${sectorHint}\nAnswer like a brilliant analyst friend. Direct, specific, use real numbers. Connect to Pakistan's economy and global markets right now. 3-5 sentences.`;
  }
}

// ── SYSTEM PROMPT ──────────────────────────────────────────────
const SYSTEM = `You are the intelligence engine behind Wall-Trade — a premium AI-powered stock analysis platform for Pakistani retail investors. You replace the noise of WhatsApp broker groups with accurate, real-time, data-driven analysis.

CRITICAL: You receive SECTOR RULES and SECTOR BENCHMARKS in every prompt. Follow them precisely. Do not apply generic valuation logic when sector-specific rules are provided.

SECTOR INTELLIGENCE RULES:
- BANKING: Primary metric is P/B and ROE. D/E of 8-10x is NORMAL — never flag it. CASA ratio matters. NPL is credit quality signal. Do not use current ratio or quick ratio.
- E&P (OGDC/PPL/MARI): Brent crude is the #1 earnings driver. PKR weakness = POSITIVE (USD revenues). Circular debt = cash flow risk even when profits look strong.
- OMC (PSO/APL/HASCOL): Thin margins (1-3%) are structural, not a red flag. Working capital and receivables are the real risks. PKR weakness = NEGATIVE.
- FERTILISER: Gas feedstock cost is everything. High dividend yield is the core investment case. Seasonal demand (rabi/kharif). FFBL is weak, FFC/EFERT are strong.
- CEMENT: Coal cost (USD) drives margins. PSDP spending drives demand. Rate cuts are bullish. Industry is in overcapacity.
- TECH: PKR weakness = POSITIVE (USD revenues). Growth rate matters more than size. Low debt = premium multiple.
- CONGLOMERATE (ENGROH): Sum-of-parts logic. Value from subsidiaries (mainly EFERT). Not a single-sector company.

YOUR EXPERTISE:
- PSX market dynamics across all sectors
- Pakistan macro: IMF programme, circular debt, SBP monetary policy, PKR dynamics, CPEC, PSDP, political economy
- Global factors: crude oil (Brent), USD strength, Fed policy, Middle East geopolitics, China economy
- Financial analysis: sector-specific KPIs, ratio analysis, comparable company analysis

YOUR COMMUNICATION STYLE:
- Always use the live market data and sector rules provided — never be generic
- Speak like the smartest analyst friend the user has — direct, confident, specific
- Use real numbers — never vague when you have specifics
- Connect financial metrics to real-world Pakistan business realities
- Your goal: every user feels they got better analysis than any WhatsApp broker

MACRO CHAIN-OF-EFFECT — ALWAYS APPLY:
When a macro event occurs, think through ALL affected sectors:
- Oil spike: POSITIVE for OGDC/PPL/MARI, NEGATIVE for PSO/cement, puts pressure on PKR/CPI
- PKR depreciation: POSITIVE for OGDC/PPL/MARI/SYS/TRG, NEGATIVE for PSO/cement/OMCs
- SBP rate cuts: POSITIVE for cement demand and leveraged companies, compresses bank NIMs short-term
- PSDP increase: POSITIVE for cement, construction, engineering
- Circular debt: Hits OGDC/PPL cash flows, PSO receivables`;

// ── STATIC MACRO CONTEXT ───────────────────────────────────────
// LAST UPDATED: April 27, 2026
const STATIC_MACRO = `SBP Policy Rate: 11.50% p.a. — JUST HIKED by 100bps from 10.50% today (April 27, 2026). This is a surprise hawkish move. Rate sensitive verdicts must reflect this immediately. Negative for banks short term NIM compression, negative for cement demand, negative for leveraged companies, positive for PKR stability.
SBP Ceiling: 12.50% | Floor: 10.50%
IMF EFF programme: Active 37-month programme — energy pricing reforms, circular debt reduction, DISCO privatisation, cost-reflective tariffs are key conditions. $1.2B tranche approved for May 8.
CPI Inflation: ~8-10% (down sharply from 38% peak — disinflation well underway but oil shock creating upside risk)
Current account: Near-balanced or slight surplus — FX reserves recovering to ~$15bn+
PSDP: Recovering as fiscal space improves with lower interest burden
PSX KSE-100: At record highs but rate hike today creates near term pressure on rate sensitive sectors
Circular debt: Rs. 2.3tn+ in power sector — still structurally problematic
Geopolitical: Iran-US tensions elevated — Brent crude at $111, Strait of Hormuz oil supply risk acute
Key risks: Oil price spike (geopolitical), surprise rate hike impact on equities, IMF programme slippage, rupee vulnerability`;

// ── MAIN HANDLER ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limit = getRateLimit(ip);
  if (limit.count >= RATE_LIMIT) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit reached. Please try again in an hour.' }) };
  }
  limit.count++;

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { type, ticker, ratios, question } = payload;

  if (!['verdict', 'question'].includes(type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type' }) };
  }

  // Ticker aliases — ENGRO was delisted Jan 2025, replaced by ENGROH
  const TICKER_ALIASES = { 'ENGRO': 'ENGROH' };
  const resolvedTicker = TICKER_ALIASES[ticker] || ticker;

  const ALLOWED = [
    // Energy & Oil
    'OGDC','PPL','PSO','MARI','APL','HASCOL','SNGP','SSGC',
    // Banking
    'HBL','MCB','UBL','NBP','ABL','BAFL','BAHL','MEBL','FABL',
    // Fertiliser — ENGROH (formerly ENGRO, delisted Jan 2025 and replaced)
    'ENGROH','EFERT','FFC','FFBL',
    // Cement
    'LUCK','MLCF','CHCC','DGKC','PIOC','FCCL'
  ];

  if (!ALLOWED.includes(resolvedTicker)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Ticker ${ticker} not supported. Supported: OGDC, PPL, PSO, MARI, HBL, MCB, UBL, NBP, ENGROH, EFERT, FFC, LUCK, MLCF, CHCC and more.` }) };
  }

  const safeQuestion = (question || '').replace(/[<>{}[\]\\]/g, '').slice(0, 500);

  // Look up sector framework for this ticker
  const framework = getSectorFramework(resolvedTicker);

  // Fetch everything in parallel — use resolvedTicker (handles ENGRO→ENGROH alias)
  const [liveMacro, liveStock] = await Promise.all([
    fetchLiveMacro(),
    getLiveStockData(resolvedTicker)
  ]);

  const macroContext  = buildMacroContext(liveMacro, STATIC_MACRO);
  const questionType  = type === 'question' ? classifyQuestion(safeQuestion, resolvedTicker) : 'verdict';

  // Pass framework and sector-filtered news into prompt builder
  const userPrompt = buildPrompt(
    type, resolvedTicker, liveStock, macroContext,
    safeQuestion, questionType,
    framework,        // sector rules, benchmarks, promptContext
    liveMacro.news    // will be filtered by sector inside buildPrompt
  );

  try {
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: userPrompt }]
    });

    const responseBody = { ...result };
    if (liveStock) responseBody.liveData = liveStock;
    if (liveMacro)  responseBody.macroData = {
      oil:       liveMacro.oil,
      gold:      liveMacro.gold,
      pkrusd:    liveMacro.pkrusd,
      kse100:    liveMacro.kse100,
      newsCount: liveMacro.news?.length || 0
    };

    return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
  } catch(err) {
    console.error('Anthropic error:', err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service unavailable' }) };
  }
};
