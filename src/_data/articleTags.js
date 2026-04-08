require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    const articles = await adapter.getArticles();
    const counts = {};
    for (const a of articles) {
      for (const tag of (a.tags || [])) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  } catch (e) {
    console.warn('articleTags build failed:', e.message);
    return [];
  }
};
