const { Client } = require('@notionhq/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 下載單張圖片到本地，避免 Notion URL 過期問題
async function downloadImage(url, filename) {
  const dir = path.join(__dirname, '../../src/assets/images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const dest = path.join(dir, filename);

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadImage(res.headers.location, filename).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(`/assets/images/${filename}`); });
    }).on('error', err => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// 掃描 Markdown 內文，下載所有圖片並替換為本地路徑
async function downloadBodyImages(markdown, slug) {
  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const matches = [...markdown.matchAll(imgRegex)];
  if (!matches.length) return markdown;

  let result = markdown;
  await Promise.all(matches.map(async ([full, alt, url], i) => {
    try {
      const ext = url.split('?')[0].split('.').pop().replace(/[^a-z0-9]/gi, '') || 'jpg';
      const filename = `${slug}-body-${i}.${ext}`;
      const localPath = await downloadImage(url, filename);
      result = result.replace(full, `![${alt}](${localPath})`);
    } catch(e) {
      console.warn(`內文圖片下載失敗 (${url.slice(0, 60)}...):`, e.message);
    }
  }));
  return result;
}

async function getArticles() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_ARTICLES_DB) return [];

  const db = await notion.dataSources.query({
    data_source_id: process.env.NOTION_ARTICLES_DB,
    filter: { property: '狀態', select: { equals: '已發布' } },
    sorts: [{ property: '發布日期', direction: 'descending' }],
  });

  return Promise.all(db.results.map(async page => {
    const id = page.id;
    const idSlug = id.replace(/-/g, '');

    // 網址別名：優先用 Notion 欄位，否則 fallback 到 page ID
    const slug = page.properties['網址別名']?.rich_text?.[0]?.plain_text?.trim() || idSlug;

    // 抓文章內文 Markdown（v5 內建）
    let body = '';
    try {
      const md = await notion.pages.retrieveMarkdown({ page_id: id });
      body = md.markdown || '';
    } catch(e) {
      console.warn(`retrieveMarkdown failed for ${id}:`, e.message);
    }

    // 下載內文圖片
    if (body) {
      try { body = await downloadBodyImages(body, idSlug); }
      catch(e) { console.warn('內文圖片處理失敗:', e.message); }
    }

    // 處理封面圖
    let image = '';
    const rawImage = page.properties['封面圖']?.files?.[0]?.file?.url
      || page.properties['封面圖']?.files?.[0]?.external?.url
      || '';
    if (rawImage) {
      try {
        const ext = rawImage.split('?')[0].split('.').pop().replace(/[^a-z0-9]/gi, '') || 'jpg';
        image = await downloadImage(rawImage, `article-${idSlug}.${ext}`);
      }
      catch(e) { console.warn('封面圖下載失敗:', e.message); image = ''; }
    }

    return {
      id,
      slug,
      title: page.properties['標題']?.title?.[0]?.plain_text || '',
      date: page.properties['發布日期']?.date?.start || '',
      summary: page.properties['3秒摘要']?.rich_text?.[0]?.plain_text || '',
      tags: page.properties['標籤']?.multi_select?.map(t => t.name) || [],
      recommended: page.properties['推薦閱讀']?.checkbox ?? false,
      image,
      body,
    };
  }));
}

async function getEvents() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_EVENTS_DB) return [];

  const db = await notion.dataSources.query({
    data_source_id: process.env.NOTION_EVENTS_DB,
    sorts: [{ property: '日期', direction: 'descending' }],
  });

  return db.results.map(page => ({
    id: page.id,
    slug: page.id.replace(/-/g, ''),
    name: page.properties['活動名稱']?.title?.[0]?.plain_text || '',
    date: page.properties['日期']?.date?.start || '',
    location: page.properties['地點']?.rich_text?.[0]?.plain_text || '',
    link: page.properties['報名連結']?.url || '',
    tags: page.properties['標籤']?.multi_select?.map(t => t.name) || [],
    description: page.properties['簡介']?.rich_text?.[0]?.plain_text || '',
    status: page.properties['狀態']?.select?.name || '',
    capacity: page.properties['人數上限']?.number || null,
  }));
}

module.exports = { getArticles, getEvents };
