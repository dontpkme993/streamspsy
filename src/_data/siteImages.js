require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    return await adapter.getSiteImages();
  } catch(e) {
    console.warn('Notion siteImages fetch failed, using empty object:', e.message);
    return {};
  }
};
