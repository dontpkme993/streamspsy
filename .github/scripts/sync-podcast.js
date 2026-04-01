require('dotenv').config();
const { Client } = require('@notionhq/client');
const Parser = require('rss-parser');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const parser = new Parser({
  customFields: {
    item: [['itunes:image', 'itunesImage', { keepArray: false }]],
  },
});

const DB_ID = process.env.NOTION_PODCAST_DB;

// ── 各平台解析邏輯 ──────────────────────────────────────────

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

function parseSoundOn(item) {
  return {
    title: item.title || '',
    guid: item.guid || item.link || '',
    date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : '',
    duration: formatDuration(item.itunes?.duration),
    summary: item.contentSnippet || '',
    image: item.itunesImage?.['$']?.href || item.itunes?.image || '',
    embedUrl: item.link?.includes('player.soundon.fm') ? item.link : '',
  };
}

function parseSpotify(item) {
  return {
    title: item.title || '',
    guid: item.guid || item.link || '',
    date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : '',
    duration: formatDuration(item.itunes?.duration),
    summary: item.contentSnippet || '',
    image: item.itunesImage?.['$']?.href || item.itunes?.image || '',
    embedUrl: item.link?.includes('/episodes/')
      ? item.link.replace('open.spotify.com', 'open.spotify.com').replace('/episodes/', '/embed/episodes/')
      : '',
  };
}

// 通用 iTunes 格式（Apple Podcast、Anchor 等）
function parseGeneric(item) {
  return {
    title: item.title || '',
    guid: item.guid || item.link || '',
    date: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : '',
    duration: formatDuration(item.itunes?.duration),
    summary: item.contentSnippet || '',
    image: item.itunesImage?.['$']?.href || item.itunes?.image || '',
    embedUrl: item.link || '',
  };
}

// ── 頻道設定（之後新增頻道在這裡加）──────────────────────────

const CHANNELS = [
  {
    name: process.env.PODCAST_CHANNEL_1_NAME || '溪水邊 Podcast',
    platform: 'SoundOn',
    rssUrl: process.env.PODCAST_RSS_URL,
    parse: parseSoundOn,
  },
  // 範例：新增第二個頻道時取消註解
  // {
  //   name: process.env.PODCAST_CHANNEL_2_NAME || 'Channel 2',
  //   platform: 'Spotify',
  //   rssUrl: process.env.PODCAST_RSS_2,
  //   parse: parseSpotify,
  // },
];

// ── Notion 操作 ──────────────────────────────────────────────

async function getExistingGuids() {
  const guids = new Set();
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DB_ID,
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

async function createEpisode(ep, channelName, platform) {
  const properties = {
    '標題': { title: [{ text: { content: ep.title.slice(0, 2000) } }] },
    'GUID': { rich_text: [{ text: { content: ep.guid.slice(0, 2000) } }] },
    '頻道': { rich_text: [{ text: { content: channelName.slice(0, 2000) } }] },
    '平台': { rich_text: [{ text: { content: platform.slice(0, 2000) } }] },
    '時長': { rich_text: [{ text: { content: ep.duration.slice(0, 2000) } }] },
    '摘要': { rich_text: [{ text: { content: ep.summary.slice(0, 2000) } }] },
    '精選': { checkbox: false },
  };
  if (ep.date) properties['發布日期'] = { date: { start: ep.date } };
  if (ep.image) properties['封面圖'] = { url: ep.image };
  if (ep.embedUrl) properties['播放連結'] = { url: ep.embedUrl };

  await notion.pages.create({ parent: { database_id: DB_ID }, properties });
}

// ── 主程式 ────────────────────────────────────────────────────

async function main() {
  if (!DB_ID) { console.warn('NOTION_PODCAST_DB 未設定，略過同步'); return; }

  const existingGuids = await getExistingGuids();
  let newCount = 0;

  for (const channel of CHANNELS) {
    if (!channel.rssUrl) {
      console.warn(`${channel.name} 無 RSS URL，略過`);
      continue;
    }
    try {
      const feed = await parser.parseURL(channel.rssUrl);
      for (const item of feed.items) {
        const ep = channel.parse(item);
        if (!ep.guid || existingGuids.has(ep.guid)) continue;
        await createEpisode(ep, channel.name, channel.platform);
        existingGuids.add(ep.guid);
        newCount++;
        console.log(`新增: [${channel.name}] ${ep.title}`);
      }
    } catch (e) {
      console.warn(`RSS 抓取失敗 (${channel.name}):`, e.message);
    }
  }

  console.log(`Podcast 同步完成，新增 ${newCount} 集`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_episodes=${newCount > 0}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
