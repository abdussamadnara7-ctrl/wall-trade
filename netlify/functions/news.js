const https = require('https');

function get(url, ms = 8000) {
  return new Promise(resolve => {
    const t = setTimeout(() => { console.log('TIMEOUT:', url.slice(0, 60)); resolve(null); }, ms);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        clearTimeout(t);
        console.log(`${url.slice(0, 60)} → ${res.statusCode}, len ${b.length}`);
        try { resolve(JSON.parse(b)); } catch { resolve(null); }
      });
    }).on('error', e => { clearTimeout(t); console.log('ERR:', e.message); resolve(null); });
  });
}

// ── FINANCIAL KEYWORDS — article must contain at least one ────
const FINANCE_KEYWORDS = [
  // Pakistan markets
  'kse', 'psx', 'karachi stock', 'pakistan stock',
  // Monetary/macro
  'sbp', 'state bank', 'policy rate', 'interest rate', 'inflation',
  'imf', 'world bank', 'current account', 'fiscal', 'budget', 'gdp',
  'forex', 'pkr', 'rupee', 'dollar', 'exchange rate', 'reserves',
  // Sectors
  'ogdc', 'ppl', 'pso', 'mari petroleum', 'hbl', 'mcb', 'ubl', 'nbp',
  'engro', 'ffc', 'efert', 'lucky cement', 'mlcf', 'dgkc', 'chcc',
  'oil price', 'crude', 'brent', 'petroleum', 'energy sector',
  'banking sector', 'fertiliser', 'cement sector',
  // Global macro relevant to Pakistan
  'federal reserve', 'fed rate', 'gold price', 'oil market',
  'commodity', 'trade deficit', 'remittance', 'fdi',
  // Finance/investment
  'dividend', 'earnings', 'profit', 'revenue', 'ebitda',
  'stock market', 'shares', 'equity', 'bond', 'yield',
  'investment', 'portfolio', 'analyst', 'brokerage'
];

// ── EXCLUSION KEYWORDS — reject if title contains these ───────
const EXCLUDE_KEYWORDS = [
  'died', 'death', 'killed', 'murder', 'accident', 'injured', 'hospital',
  'arrest', 'police', 'crime', 'court', 'jail', 'prison', 'convicted',
  'fire', 'flood', 'earthquake', 'disaster', 'weather',
  'election', 'political', 'politician', 'party', 'vote', 'minister',
  'cricket', 'football', 'sport', 'match', 'tournament', 'player',
  'celebrity', 'actor', 'actress', 'film', 'drama', 'showbiz',
  'recipe', 'food', 'travel', 'tourism', 'fashion', 'lifestyle',
  'health tips', 'covid', 'disease', 'hospital'
];

function isFinancialNews(title, description) {
  if (!title) return false;
  const text = (title + ' ' + (description || '')).toLowerCase();

  // Reject if contains exclusion keywords
  if (EXCLUDE_KEYWORDS.some(k => text.includes(k))) return false;

  // Must contain at least one finance keyword
  return FINANCE_KEYWORDS.some(k => text.includes(k));
}

// ── TAG based on content ────────────────────────────────────── 
function tagArticle(title) {
  const t = title.toLowerCase();
  if (t.includes('kse') || t.includes('psx') || t.includes('stock exchange') || t.includes('shares') || t.includes('equity'))
    return { tag: 'KSE-100', tagColor: '#34d399', tagBg: 'rgba(52,211,153,0.1)', tagBorder: 'rgba(52,211,153,0.25)' };
  if (t.includes('sbp') || t.includes('state bank') || t.includes('policy rate') || t.includes('monetary'))
    return { tag: 'SBP', tagColor: '#fbbf24', tagBg: 'rgba(251,191,36,0.1)', tagBorder: 'rgba(251,191,36,0.25)' };
  if (t.includes('imf') || t.includes('world bank') || t.includes('adb'))
    return { tag: 'IMF', tagColor: '#fb923c', tagBg: 'rgba(251,146,60,0.1)', tagBorder: 'rgba(251,146,60,0.25)' };
  if (t.includes('rupee') || t.includes('pkr') || t.includes('exchange rate') || t.includes('forex') || t.includes('dollar') || t.includes('reserves'))
    return { tag: 'FX', tagColor: '#818cf8', tagBg: 'rgba(129,140,248,0.1)', tagBorder: 'rgba(129,140,248,0.25)' };
  if (t.includes('oil') || t.includes('crude') || t.includes('brent') || t.includes('petroleum') || t.includes('energy') || t.includes('ogdc') || t.includes('ppl'))
    return { tag: 'ENERGY', tagColor: '#f472b6', tagBg: 'rgba(244,114,182,0.1)', tagBorder: 'rgba(244,114,182,0.25)' };
  if (t.includes('bank') || t.includes('hbl') || t.includes('mcb') || t.includes('ubl') || t.includes('nbp'))
    return { tag: 'BANKING', tagColor: '#38bdf8', tagBg: 'rgba(56,189,248,0.1)', tagBorder: 'rgba(56,189,248,0.25)' };
  if (t.includes('cement') || t.includes('luck') || t.includes('mlcf') || t.includes('dgkc'))
    return { tag: 'CEMENT', tagColor: '#a78bfa', tagBg: 'rgba(167,139,250,0.1)', tagBorder: 'rgba(167,139,250,0.25)' };
  if (t.includes('fertiliser') || t.includes('fertilizer') || t.includes('engro') || t.includes('ffc') || t.includes('efert'))
    return { tag: 'FERTILISER', tagColor: '#34d399', tagBg: 'rgba(52,211,153,0.1)', tagBorder: 'rgba(52,211,153,0.25)' };
  if (t.includes('inflation') || t.includes('gdp') || t.includes('budget') || t.includes('fiscal') || t.includes('current account') || t.includes('remittance'))
    return { tag: 'MACRO', tagColor: '#fb923c', tagBg: 'rgba(251,146,60,0.1)', tagBorder: 'rgba(251,146,60,0.25)' };
  if (t.includes('gold') || t.includes('commodity') || t.includes('federal reserve') || t.includes('fed'))
    return { tag: 'GLOBAL', tagColor: '#fbbf24', tagBg: 'rgba(251,191,36,0.1)', tagBorder: 'rgba(251,191,36,0.25)' };
  if (t.includes('dividend') || t.includes('earnings') || t.includes('profit') || t.includes('revenue'))
    return { tag: 'EARNINGS', tagColor: '#34d399', tagBg: 'rgba(52,211,153,0.1)', tagBorder: 'rgba(52,211,153,0.25)' };
  // Default financial tag
  return { tag: 'FINANCE', tagColor: '#818cf8', tagBg: 'rgba(129,140,248,0.1)', tagBorder: 'rgba(129,140,248,0.25)' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const key = process.env.NEWSDATA_API_KEY;
  if (!key) return { statusCode: 200, headers, body: JSON.stringify({ news: [], error: 'No API key' }) };

  // 3 targeted financial queries — all business/economy specific
  const [pkFinanceData, pkMarketData, globalMacroData] = await Promise.all([
    // Pakistan business/economy with financial keywords
    get(`https://newsdata.io/api/1/news?apikey=${key}&country=pk&category=business&language=en&q=economy+OR+finance+OR+market+OR+rupee+OR+SBP+OR+PSX&size=10`),
    // Pakistan stock market specific
    get(`https://newsdata.io/api/1/news?apikey=${key}&country=pk&category=business&language=en&q=stocks+OR+KSE+OR+shares+OR+dividend+OR+earnings&size=6`),
    // Global macro relevant to Pakistan
    get(`https://newsdata.io/api/1/news?apikey=${key}&language=en&q=oil+price+OR+gold+price+OR+IMF+Pakistan+OR+Fed+rate&size=6`)
  ]);

  const raw = [];

  const addArticles = (data) => {
    if (!data?.results?.length) return;
    data.results.forEach(a => {
      if (!a.title || a.title.length < 15) return;
      // Strict financial filter
      if (!isFinancialNews(a.title, a.description)) {
        console.log(`FILTERED OUT: ${a.title.slice(0, 60)}`);
        return;
      }
      raw.push({
        title: a.title,
        url: a.link || '#',
        source: a.source_name || a.source_id || 'News',
        description: a.description || '',
        time: formatDate(a.pubDate),
        ...tagArticle(a.title)
      });
    });
  };

  addArticles(pkFinanceData);
  addArticles(pkMarketData);
  addArticles(globalMacroData);

  // Deduplicate
  const seen = new Set();
  const deduped = raw.filter(n => {
    const k = n.title.slice(0, 60).toLowerCase().replace(/\s+/g, '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`News: ${raw.length} raw → ${deduped.length} after filter & dedup`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ news: deduped.slice(0, 8), timestamp: new Date().toISOString() })
  };
};
