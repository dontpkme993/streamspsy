require('dotenv').config();
const { Client } = require('@notionhq/client');
const { downloadImage } = require('../adapters/notion');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async () => {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_CARDS_DB) {
    console.warn('[cards] 缺少 NOTION_TOKEN 或 NOTION_CARDS_DB，跳過');
    return [];
  }
  console.log('[cards] DB ID prefix:', process.env.NOTION_CARDS_DB.slice(0, 8));

  try {
    const db = await notion.databases.query({
      database_id: process.env.NOTION_CARDS_DB,
      filter: { property: '發佈', checkbox: { equals: true } },
    });
    console.log('[cards] 查詢成功，共', db.results.length, '筆（已發佈）');

    return Promise.all(db.results.map(async page => {
      const p = page.properties;
      const idSlug = page.id.replace(/-/g, '');

      const rawImage = p['圖片']?.files?.[0]?.file?.url || p['圖片']?.files?.[0]?.external?.url || '';
      let image = '';
      if (rawImage) {
        try {
          const ext = rawImage.split('?')[0].split('.').pop().replace(/[^a-z0-9]/gi, '') || 'jpg';
          image = await downloadImage(rawImage, `card-${idSlug}.${ext}`);
        } catch (e) {
          console.warn(`card image download failed:`, e.message);
        }
      }

      return {
        number: p['編號']?.rich_text?.[0]?.plain_text || '',
        title: p['名稱']?.title?.[0]?.plain_text || '',
        keyword: p['關鍵字']?.rich_text?.[0]?.plain_text || '',
        interpretTitle: p['解析標題']?.rich_text?.[0]?.plain_text || '',
        interpretBody: p['解析內文']?.rich_text?.map(t => t.plain_text).join('') || '',
        interpretMessage: p['結語']?.rich_text?.[0]?.plain_text || '',
        tags: p['標籤']?.multi_select?.map(t => t.name) || [],
        image,
      };
    }));
  } catch (e) {
    console.error('[cards] 查詢失敗:', e.message);
    if (e.code) console.error('[cards] error code:', e.code);
    if (e.status) console.error('[cards] HTTP status:', e.status);
    return [];
  }
};
