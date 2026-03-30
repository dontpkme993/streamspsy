require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    return await adapter.getEvents();
  } catch(e) {
    console.warn('Notion events fetch failed, using empty array:', e.message);
    return [];
  }
};
