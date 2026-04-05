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

// Tag mapping based on keywords in title
function tagArticle(title) {
  const t = title.toLowerCase();
  if (t.includes('kse') || t.includes('psx') || t.includes('stock') || t.includes('shares') || t.includes('equity'))
    return { tag: 'KSE-100', tagColor: '#34d399', tagBg: 'rgba(52,211,153,0.1)', tagBorder: 'rgba(52,211,153,0.25)' };
  if (t.includes('sbp') || t.includes('policy rate') || t.includes('interest rate') || t.includes('monetary'))
    return { tag: 'SBP', tagColor: '#fbbf24', tagBg: 'rgba(251,191,36,0.1)', tagBorder: 'rgba(251,191,36,0.25)' };
  if (t.includes('imf') || t.includes('world bank') || t.includes('adb'))
    return { tag: 'IMF', tagColor: '#fb923c', tagBg: 'rgba(251,146,60,0.1)', tagBorder: 'rgba(251,146,60,0.25)' };
  if (t.includes('rupee') || t.includes('pkr') || t.includes('dollar') || t.includes('forex') || t.includes('currency'))
    return { tag: 'FX', tagColor: '#818cf8', tagBg: 'rgba(129,140,248,0.1)', tagBorder: 'rgba(129,140,248,0.25)' };
  if (t.includes('oil') || t.includes('gas') || t.includes('energy') || t.includes('petrol') || t.includes('ogdc') || t.includes('ppl'))
    return { tag: 'ENERGY', tagColor: '#f472b6', tagBg: 'rgba(244,114,182,0.1)', tagBorder: 'rgba(244,114,182,0.25)' };
  if (t.includes('bank') || t.includes('hbl') || t.includes('mcb') || t.includes('ubl') || t.includes('nbp'))
    return { tag: 'BANKING', tagColor: '#38bdf8', tagBg: 'rgba(56,189,248,0.1)', tagBorder: 'rgba(56,189,248,0.25)' };
  if (t.includes('cement') || t.includes('luck') || t.includes('mlcf') || t.includes('dgkc'))
    return { tag: 'CEMENT', tagColor: '#a78bfa', tagBg: 'rgba(167,139,250,0.1)', tagBorder: 'rgba(167,139,250,0.25)' };
  if (t.includes('fertiliser') || t.includes('fertilizer') || t.includes('engro') || t.includes('ffc'))
    return { tag: 'FERTILISER', tagColor: '#34d399', tagBg: 'rgba(52,211,153,0.1)', tagBorder: 'rgba(52,211,153,0.25)' };
  if (t.includes('gold') || t.includes('bitcoin') || t.includes('crypto'))
    return { tag: 'GLOBAL', tagColor: '#fbbf24', tagBg: 'rgba(251,191,36,0.1)', tagBorder: 'rgba(251,191,36,0.25)' };
  if (t.includes('inflation') || t.includes('gdp') || t.includes('budget') || t.includes('fiscal') || t.includes('economy'))
    return { tag: 'MACRO', tagColor: '#fb923c', tagBg: 'rgba(251,146,60,0.1)', tagBorder: 'rgba(251,146,60,0.25)' };
  return { tag: 'MARKET', tagColor: '#818cf8', tagBg: 'rgba(129,140,248,0.1)', tagBorder: 'rgba(129,140,248,0.25)' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=600' // cache 10 mins
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const key = process.env.NEWSDATA_API_KEY;
  if (!key) {
    console.log('NO NEWSDATA_API_KEY');
    return { statusCode: 200, headers, body: JSON.stringify({ news: [], error: 'No API key' }) };
  }

  // Fetch 2 queries in parallel:
  // 1. Pakistan business/economy news (local)
  // 2. Global macro news relevant to Pakistan (oil, gold, IMF, Fed)
  const [pakistanData, oilData, macroData] = await Promise.all([
    get(`https://newsdata.io/api/1/news?apikey=${key}&country=pk&category=business,top&language=en&size=8`),
    get(`https://newsdata.io/api/1/news?apikey=${key}&q=oil+gold+commodities&language=en&size=3`),
    get(`https://newsdata.io/api/1/news?apikey=${key}&q=IMF+Fed+economy&language=en&size=3`)
  ]);
  const globalData = { results: [...(oilData?.results||[]), ...(macroData?.results||[])] };

  const news = [];

  // Process Pakistan news
  if (pakistanData?.results?.length) {
    console.log(`Pakistan news: ${pakistanData.results.length} articles`);
    pakistanData.results.forEach(a => {
      if (!a.title || a.title.length < 10) return;
      const tagInfo = tagArticle(a.title);
      news.push({
        title: a.title,
        url: a.link || '#',
        source: a.source_name || a.source_id || 'Pakistan News',
        time: formatDate(a.pubDate),
        ...tagInfo
      });
    });
  } else {
    console.log('Pakistan news failed:', JSON.stringify(pakistanData)?.slice(0, 200));
  }

  // Process global macro news
  if (globalData?.results?.length) {
    console.log(`Global news: ${globalData.results.length} articles`);
    globalData.results.forEach(a => {
      if (!a.title || a.title.length < 10) return;
      const tagInfo = tagArticle(a.title);
      news.push({
        title: a.title,
        url: a.link || '#',
        source: a.source_name || a.source_id || 'Global Markets',
        time: formatDate(a.pubDate),
        ...tagInfo
      });
    });
  } else {
    console.log('Global news failed:', JSON.stringify(globalData)?.slice(0, 200));
  }

  // Deduplicate by title similarity
  const seen = new Set();
  const deduped = news.filter(n => {
    const key = n.title.slice(0, 50).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Total news: ${deduped.length} articles`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ news: deduped.slice(0, 10), timestamp: new Date().toISOString() })
  };
};
