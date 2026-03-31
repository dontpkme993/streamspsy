const Parser = require('rss-parser');
const parser = new Parser();

const FEED_URL = process.env.PODCAST_RSS_URL || 'https://anchor.fm/s/1ea77470/podcast/rss';

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
        duration: item.itunes?.duration || '',
        embedUrl: item.link?.includes('/episodes/')
          ? item.link.replace('/episodes/', '/embed/episodes/')
          : null,
        link: item.link || '',
        summary: item.contentSnippet || item.content || '',
      })),
    };
  } catch (e) {
    console.warn('Podcast RSS 抓取失敗:', e.message);
    return { title: '', description: '', image: '', episodes: [] };
  }
};
