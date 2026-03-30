require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    return await adapter.getArticles();
  } catch(e) {
    console.warn('Notion articles fetch failed, using empty array:', e.message);
    return [];
  }
};
