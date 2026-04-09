require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async () => {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_THERAPISTS_DB) return [];

  try {
    const db = await notion.databases.query({
      database_id: process.env.NOTION_THERAPISTS_DB,
      filter: { property: '顯示', checkbox: { equals: true } },
      sorts: [{ property: '排序', direction: 'ascending' }],
    });

    return db.results.map(page => {
      const p = page.properties;
      const name = p['姓名']?.title?.[0]?.plain_text || '';
      const encodedName = encodeURIComponent(name);

      return {
        name,
        title: p['職稱']?.select?.name || '',
        badge: p['資歷']?.rich_text?.[0]?.plain_text || '',
        photo: p['照片']?.files?.[0]?.file?.url || p['照片']?.files?.[0]?.external?.url || '',
        audiences: p['服務對象']?.multi_select?.map(t => t.name) || [],
        focuses: p['專長標籤']?.multi_select?.map(t => t.name) || [],
        bookingLink: p['預約連結']?.url || '',
        order: p['排序']?.number ?? 999,
        status: p['預約狀態']?.select?.name || '開放預約',
        articlesUrl: `/articles/#author=${encodedName}`,
        mediaUrl: `/media/#author=${encodedName}`,
      };
    });
  } catch (e) {
    console.warn('therapists fetch failed:', e.message);
    return [];
  }
};
