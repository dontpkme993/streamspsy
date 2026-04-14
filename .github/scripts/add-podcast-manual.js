require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_PODCAST_DB;

async function main() {
  if (!DB_ID) { console.error('NOTION_PODCAST_DB 未設定'); process.exit(1); }

  const title    = process.env.EP_TITLE?.trim();
  const date     = process.env.EP_DATE?.trim();
  const embedUrl = process.env.EP_EMBED_URL?.trim();
  const platform = process.env.EP_PLATFORM?.trim() || '';
  const channel  = process.env.EP_CHANNEL?.trim() || '';
  const author   = process.env.EP_AUTHOR?.trim() || '';
  const duration = process.env.EP_DURATION?.trim() || '';
  const summary  = process.env.EP_SUMMARY?.trim() || '';

  if (!title)    { console.error('標題為必填'); process.exit(1); }
  if (!embedUrl) { console.error('播放連結為必填'); process.exit(1); }

  const properties = {
    '標題':   { title: [{ text: { content: title.slice(0, 2000) } }] },
    'GUID':   { rich_text: [{ text: { content: embedUrl.slice(0, 2000) } }] },
    '來源':   { select: { name: '手動' } },
    '發佈':   { checkbox: true },
    '精選':   { checkbox: false },
  };

  if (date)     properties['發布日期']  = { date: { start: date } };
  if (embedUrl) properties['播放連結']  = { url: embedUrl };
  if (platform) properties['平台']     = { select: { name: platform } };
  if (channel)  properties['頻道']     = { select: { name: channel } };
  if (duration) properties['時長']     = { rich_text: [{ text: { content: duration } }] };
  if (summary)  properties['摘要']     = { rich_text: [{ text: { content: summary.slice(0, 2000) } }] };

  if (author) {
    const authors = author.split(',').map(a => ({ name: a.trim() })).filter(a => a.name);
    if (authors.length) properties['作者'] = { multi_select: authors };
  }

  await notion.pages.create({
    parent: { type: 'database_id', database_id: DB_ID },
    properties,
  });

  console.log(`✓ 已新增手動 Podcast：${title}`);
}

main().catch(e => { console.error(e); process.exit(1); });
