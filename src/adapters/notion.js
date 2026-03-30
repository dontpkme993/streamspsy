const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const https = require('https');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function downloadImage(url, filename) {
  const dir = path.join(__dirname, '../../_site/images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  // download logic
  return `/images/${filename}`;
}

async function getArticles() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_ARTICLES_DB) return [];
  const db = await notion.databases.query({
    database_id: process.env.NOTION_ARTICLES_DB,
    filter: { property: '狀態', select: { equals: '已發布' } },
    sorts: [{ property: '發布日期', direction: 'descending' }]
  });
  return db.results.map(page => ({
    id: page.id,
    title: page.properties['標題']?.title?.[0]?.plain_text || '',
    date: page.properties['發布日期']?.date?.start || '',
    summary: page.properties['3秒摘要']?.rich_text?.[0]?.plain_text || '',
    tags: page.properties['標籤']?.multi_select?.map(t => t.name) || [],
    image: page.properties['封面圖']?.files?.[0]?.file?.url || '',
    slug: page.id,
  }));
}

async function getEvents() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_EVENTS_DB) return [];
  const db = await notion.databases.query({
    database_id: process.env.NOTION_EVENTS_DB,
    sorts: [{ property: '日期', direction: 'descending' }]
  });
  return db.results.map(page => ({
    id: page.id,
    name: page.properties['活動名稱']?.title?.[0]?.plain_text || '',
    date: page.properties['日期']?.date?.start || '',
    location: page.properties['地點']?.rich_text?.[0]?.plain_text || '',
    link: page.properties['報名連結']?.url || '',
    tags: page.properties['標籤']?.multi_select?.map(t => t.name) || [],
    description: page.properties['簡介']?.rich_text?.[0]?.plain_text || '',
    status: page.properties['狀態']?.select?.name || '',
  }));
}

module.exports = { getArticles, getEvents };
