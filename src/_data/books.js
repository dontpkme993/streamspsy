require('dotenv').config();
const adapter = require('../adapters/notion');

module.exports = async () => {
  try {
    return await adapter.getBooks();
  } catch (e) {
    console.warn('Books 資料抓取失敗:', e.message);
    return [];
  }
};
