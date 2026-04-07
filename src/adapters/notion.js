const { Client } = require('@notionhq/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 將 rich_text 陣列轉為 Markdown 字串，處理 bold/italic/code/link
function richTextToMd(richTexts) {
  return (richTexts || []).map(t => {
    let s = t.plain_text;
    if (!s) return '';
    if (t.annotations?.code) s = `\`${s}\``;
    if (t.annotations?.bold) s = `**${s}**`;
    if (t.annotations?.italic) s = `*${s}*`;
    if (t.annotations?.strikethrough) s = `~~${s}~~`;
    if (t.href) s = `[${s}](${t.href})`;
    return s;
  }).join('');
}

// 將 Notion blocks 陣列轉為 Markdown 字串
function blocksToMarkdown(blocks) {
  const lines = [];
  let numberedIdx = 0;

  for (const block of blocks) {
    const type = block.type;
    const data = block[type];

    if (type === 'heading_1') {
      lines.push(`# ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    } else if (type === 'heading_2') {
      lines.push(`## ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    } else if (type === 'heading_3') {
      lines.push(`### ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    } else if (type === 'paragraph') {
      lines.push(richTextToMd(data.rich_text));
      numberedIdx = 0;
    } else if (type === 'bulleted_list_item') {
      lines.push(`- ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    } else if (type === 'numbered_list_item') {
      numberedIdx++;
      lines.push(`${numberedIdx}. ${richTextToMd(data.rich_text)}`);
    } else if (type === 'quote') {
      lines.push(`> ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    } else if (type === 'code') {
      const lang = data.language || '';
      lines.push(`\`\`\`${lang}\n${richTextToMd(data.rich_text)}\n\`\`\``);
      numberedIdx = 0;
    } else if (type === 'divider') {
      lines.push('---');
      numberedIdx = 0;
    } else if (type === 'image') {
      const url = data.file?.url || data.external?.url || '';
      const caption = richTextToMd(data.caption) || '';
      lines.push(`![${caption}](${url})`);
      numberedIdx = 0;
    } else if (type === 'callout') {
      lines.push(`> ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    } else if (type === 'to_do') {
      const checked = data.checked ? 'x' : ' ';
      lines.push(`- [${checked}] ${richTextToMd(data.rich_text)}`);
      numberedIdx = 0;
    }
    // 其他類型忽略
  }

  return lines.join('\n\n');
}

// 取得頁面所有 blocks（處理分頁）
async function getPageBlocks(pageId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return blocks;
}

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
      result = result.replace(full, () => `![${alt}](${localPath})`);
    } catch(e) {
      console.warn(`內文圖片下載失敗 (${url.slice(0, 60)}...):`, e.message);
    }
  }));
  return result;
}

async function getArticles() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_ARTICLES_DB) return [];

  const db = await notion.databases.query({
    database_id: process.env.NOTION_ARTICLES_DB,
    filter: { property: '狀態', select: { equals: '已發布' } },
    sorts: [{ property: '發布日期', direction: 'descending' }],
  });

  return Promise.all(db.results.map(async page => {
    const id = page.id;
    const idSlug = id.replace(/-/g, '');

    // 網址別名：優先用 Notion 欄位，否則 fallback 到 page ID
    const slug = page.properties['網址別名']?.rich_text?.[0]?.plain_text?.trim() || idSlug;

    // 抓文章內文 Markdown
    let body = '';
    try {
      const blocks = await getPageBlocks(id);
      body = blocksToMarkdown(blocks);
    } catch(e) {
      console.warn(`blocks fetch failed for ${id}:`, e.message);
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

  const db = await notion.databases.query({
    database_id: process.env.NOTION_EVENTS_DB,
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

async function getPodcastEpisodes() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_PODCAST_DB) return [];

  const db = await notion.databases.query({
    database_id: process.env.NOTION_PODCAST_DB,
    sorts: [{ property: '發布日期', direction: 'descending' }],
  });

  return db.results.map(page => ({
    id: page.id,
    title: page.properties['標題']?.title?.[0]?.plain_text || '',
    guid: page.properties['GUID']?.rich_text?.[0]?.plain_text || '',
    channel: page.properties['頻道']?.rich_text?.[0]?.plain_text || '',
    platform: page.properties['平台']?.rich_text?.[0]?.plain_text || '',
    date: page.properties['發布日期']?.date?.start || '',
    duration: page.properties['時長']?.rich_text?.[0]?.plain_text || '',
    summary: page.properties['摘要']?.rich_text?.[0]?.plain_text || '',
    image: page.properties['封面圖']?.url || '',
    embedUrl: page.properties['播放連結']?.url || '',
    featured: page.properties['精選']?.checkbox ?? false,
  }));
}

module.exports = { getArticles, getEvents, getPodcastEpisodes };
