require('dotenv').config();
const { Client } = require('@notionhq/client');
const Parser = require('rss-parser');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const parser = new Parser({
  customFields: {
    item: [['itunes:image', 'itunesImage', { keepArray: false }]],
  },
});

const DB_ID   = process.env.NOTION_PODCAST_DB;
const RSS_URL = process.env.PODCAST_RSS_URL;
const EP_URL  = process.env.EP_URL?.trim();

function formatDuration(raw) {
  if (!raw) return '';
  const secs = parseInt(raw, 10);
  if (isNaN(secs)) return String(raw);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function detectPlatform(url) {
  if (url.includes('soundon.fm'))  return 'SoundOn';
  if (url.includes('spotify.com')) return 'Spotify';
  if (url.includes('apple.com'))   return 'Apple Podcast';
  return '';
}

// 從 URL 拆出 episode UUID
function extractEpisodeId(url) {
  const match = url.match(/\/episodes?\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}

// SoundOn player URL → RSS feed URL
function soundOnRssFromUrl(url) {
  const match = url.match(/soundon\.fm\/p\/([a-f0-9-]{36})/i);
  return match ? `https://feeds.soundon.fm/podcasts/${match[1]}.xml` : null;
}

// 決定要用哪個 RSS URL 來比對
function resolveRssUrl(url, fallbackRss) {
  const derived = soundOnRssFromUrl(url);
  return derived || fallbackRss;
}

async function findInRSS(url, rssUrl) {
  const episodeId = extractEpisodeId(url);
  const feed = await parser.parseURL(rssUrl);
  const channelName = feed.title?.trim() || '';

  for (const item of feed.items) {
    const guid = item.guid || '';
    const link = item.link || '';
    if (episodeId && (guid.includes(episodeId) || link.includes(episodeId))) {
      return { item, channelName };
    }
    if (guid === url || link === url) {
      return { item, channelName };
    }
  }
  return null;
}

async function getExistingGuids() {
  const guids = new Set();
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    res.results.forEach(p => {
      const guid = p.properties['GUID']?.rich_text?.[0]?.plain_text;
      if (guid) guids.add(guid);
    });
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return guids;
}

async function main() {
  if (!EP_URL)  { console.error('EP_URL 未設定'); process.exit(1); }
  if (!DB_ID)   { console.error('NOTION_PODCAST_DB 未設定'); process.exit(1); }
  if (!RSS_URL) { console.error('PODCAST_RSS_URL 未設定'); process.exit(1); }

  const platform = detectPlatform(EP_URL);
  const rssUrl   = resolveRssUrl(EP_URL, RSS_URL);
  console.log(`連結：${EP_URL}`);
  console.log(`平台：${platform || '未知'}`);
  console.log(`比對 RSS：${rssUrl}`);

  const found = await findInRSS(EP_URL, rssUrl);
  if (!found) {
    console.error(`RSS 中找不到對應集數，請確認連結是否屬於此頻道。`);
    process.exit(1);
  }

  const { item, channelName } = found;
  const title    = item.title || '';
  const guid     = item.guid || item.link || EP_URL;
  const date     = item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : '';
  const duration = formatDuration(item.itunes?.duration);
  const summary  = item.contentSnippet || '';
  const image    = item.itunesImage?.['$']?.href || item.itunes?.image || '';
  const embedUrl = item.link?.includes('player.soundon.fm') ? item.link : EP_URL;

  console.log(`找到集數：${title}`);

  // 避免重複
  const existingGuids = await getExistingGuids();
  if (existingGuids.has(guid)) {
    console.warn(`此集數已存在於資料庫（GUID: ${guid}），略過。`);
    return;
  }

  const properties = {
    '標題':  { title: [{ text: { content: title.slice(0, 2000) } }] },
    'GUID':  { rich_text: [{ text: { content: guid.slice(0, 2000) } }] },
    '頻道':  { select: { name: channelName.slice(0, 100) } },
    '平台':  { select: { name: (platform || '').slice(0, 100) } },
    '時長':  { rich_text: [{ text: { content: duration } }] },
    '摘要':  { rich_text: [{ text: { content: summary.slice(0, 2000) } }] },
    '作者':  { multi_select: [{ name: '江玲承' }] },
    '精選':  { checkbox: false },
    '發佈':  { checkbox: true },
    '來源':  { select: { name: '手動' } },
  };

  if (date)     properties['發布日期'] = { date: { start: date } };
  if (image)    properties['封面圖']   = { url: image };
  if (embedUrl) properties['播放連結'] = { url: embedUrl };

  await notion.pages.create({
    parent: { type: 'database_id', database_id: DB_ID },
    properties,
  });

  console.log(`✓ 已新增：${title}`);
}

main().catch(e => { console.error(e); process.exit(1); });
