const Parser = require('rss-parser');
const parser = new Parser({
  customFields: {
    item: [['itunes:image', 'itunesImage', { keepArray: false }]],
  },
});

const FEED_URL = process.env.PODCAST_RSS_URL || 'https://feeds.soundon.fm/podcasts/4c45e8f1-b681-4206-a47c-bc964b46116f.xml';

function formatDuration(raw) {
  if (!raw) return '';
  const secs = parseInt(raw, 10);
  if (isNaN(secs)) return raw; // 已是格式化字串則直接回傳
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = async function () {
  try {
    const feed = await parser.parseURL(FEED_URL);
    return {
      title: feed.title || '',
      description: feed.description || '',
      image: feed.image?.url || feed.itunes?.image || '',
      episodes: feed.items.map(item => ({
        title: item.title || '',
        date: item.pubDate || '',
        duration: formatDuration(item.itunes?.duration),
        embedUrl: item.link?.includes('player.soundon.fm') ? item.link : null,
        link: item.link || '',
        image: item.itunesImage?.['$']?.href || item.itunes?.image || '',
        summary: item.contentSnippet || item.content || '',
      })),
    };
  } catch (e) {
    console.warn('Podcast RSS 抓取失敗:', e.message);
    return { title: '', description: '', image: '', episodes: [] };
  }
};
