require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    const episodes = await adapter.getPodcastEpisodes();
    return {
      episodes,
      featured: episodes.filter(ep => ep.featured),
    };
  } catch (e) {
    console.warn('Podcast 資料抓取失敗:', e.message);
    return { episodes: [], featured: [] };
  }
};
