require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    const episodes = await adapter.getPodcastEpisodes();
    const seen = new Set();
    const authors = [];
    for (const ep of episodes) {
      for (const name of (ep.authors || [])) {
        if (!seen.has(name)) { seen.add(name); authors.push(name); }
      }
    }
    return authors;
  } catch (e) {
    console.warn('podcastAuthors build failed:', e.message);
    return [];
  }
};
