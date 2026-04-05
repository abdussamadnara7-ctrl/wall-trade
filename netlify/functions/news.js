const https = require('https');

function fetchXML(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { clearTimeout(timer); resolve(body); });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function parseRSS(xml, source, tag, tagColor) {
  if (!xml) return [];
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  
  for (const item of itemMatches.slice(0, 4)) {
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                   item.match(/<title>(.*?)<\/title>/) || [])[1];
    const link  = (item.match(/<link>(.*?)<\/link>/) || 
                   item.match(/<guid>(.*?)<\/guid>/) || [])[1];
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1];
    
    if (!title) continue;
    
    let timeStr = '';
    if (pubDate) {
      try {
        const d = new Date(pubDate);
        timeStr = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch(e) {}
    }
    
    items.push({
      title: title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim(),
      url: link?.trim() || '#',
      source,
      tag,
      tagColor,
      time: timeStr
    });
  }
  return items;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // cache news 5 mins
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const FEEDS = [
    { url: 'https://www.dawn.com/feeds/business',    source: 'Dawn Business',     tag: 'PSX',    tagColor: '#34d399' },
    { url: 'https://www.brecorder.com/feed',          source: 'Business Recorder', tag: 'KSE-100', tagColor: '#818cf8' },
    { url: 'https://thenews.com.pk/rss/2/5',          source: 'The News',          tag: 'IMF',    tagColor: '#fb923c' },
    { url: 'https://arynews.tv/feed/',                source: 'ARY News',          tag: 'ECONOMY', tagColor: '#f472b6' }
  ];

  try {
    const results = await Promise.all(
      FEEDS.map(f => fetchXML(f.url).then(xml => parseRSS(xml, f.source, f.tag, f.tagColor)))
    );

    const allNews = results.flat().filter(Boolean);
    // Interleave sources instead of grouping
    const interleaved = [];
    const maxLen = Math.max(...results.map(r => r.length));
    for (let i = 0; i < maxLen; i++) {
      results.forEach(r => { if (r[i]) interleaved.push(r[i]); });
    }

    console.log(`News fetched: ${interleaved.length} articles`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ news: interleaved.slice(0, 10), timestamp: new Date().toISOString() })
    };
  } catch(e) {
    console.error('News error:', e.message);
    return { statusCode: 200, headers, body: JSON.stringify({ news: [], error: e.message }) };
  }
};
