require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    const articles = await adapter.getArticles();
    const seen = new Set();
    const authors = [];
    for (const a of articles) {
      for (const name of (a.authors || [])) {
        if (!seen.has(name)) { seen.add(name); authors.push(name); }
      }
    }
    return authors;
  } catch (e) {
    console.warn('articleAuthors build failed:', e.message);
    return [];
  }
};
