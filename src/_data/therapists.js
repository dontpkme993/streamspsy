require('dotenv').config();
const { Client } = require('@notionhq/client');
const { downloadImage } = require('../adapters/notion');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async () => {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_THERAPISTS_DB) return [];

  try {
    const db = await notion.databases.query({
      database_id: process.env.NOTION_THERAPISTS_DB,
      filter: { property: '顯示', checkbox: { equals: true } },
      sorts: [{ property: '排序', direction: 'ascending' }],
    });

    return Promise.all(db.results.map(async page => {
      const p = page.properties;
      const name = p['姓名']?.title?.[0]?.plain_text || '';
      const encodedName = encodeURIComponent(name);
      const idSlug = page.id.replace(/-/g, '');

      // 下載照片到本地，避免 Notion URL 過期
      const rawPhoto = p['照片']?.files?.[0]?.file?.url || p['照片']?.files?.[0]?.external?.url || '';
      let photo = '';
      if (rawPhoto) {
        try {
          const ext = rawPhoto.split('?')[0].split('.').pop().replace(/[^a-z0-9]/gi, '') || 'jpg';
          photo = await downloadImage(rawPhoto, `therapist-${idSlug}.${ext}`);
        } catch (e) {
          console.warn(`therapist photo download failed (${name}):`, e.message);
        }
      }

      return {
        name,
        title: p['職稱']?.select?.name || '',
        badge: p['資歷']?.rich_text?.[0]?.plain_text || '',
        photo,
        audiences: p['服務對象']?.multi_select?.map(t => t.name) || [],
        focuses: p['專長標籤']?.multi_select?.map(t => t.name) || [],
        bookingLink: p['預約連結']?.url || '',
        order: p['排序']?.number ?? 999,
        status: p['預約狀態']?.select?.name || '開放預約',
        articlesUrl: `/articles/#author=${encodedName}`,
        mediaUrl: `/media/#author=${encodedName}`,
      };
    }));
  } catch (e) {
    console.warn('therapists fetch failed:', e.message);
    return [];
  }
};
