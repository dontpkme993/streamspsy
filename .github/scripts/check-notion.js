const { Client } = require('@notionhq/client');
const https = require('https');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const DBS = [
  process.env.NOTION_ARTICLES_DB,
  process.env.NOTION_EVENTS_DB,
].filter(Boolean);

const LAST_BUILD_TIME = process.env.LAST_BUILD_TIME || '2000-01-01T00:00:00.000Z';

console.log('上次 build 時間:', LAST_BUILD_TIME);
console.log('監測 DB 數量:', DBS.length);

function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`);
  }
  console.log(`output: ${key}=${value}`);
}

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${process.env.GH_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'notion-deploy-action',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function checkDB(dbId) {
  const res = await notion.dataSources.query({
    data_source_id: dbId,
    filter: {
      timestamp: 'last_edited_time',
      last_edited_time: { after: LAST_BUILD_TIME },
    },
  });
  const count = res.results?.length || 0;
  console.log(`DB ${dbId.slice(0, 8)}... 有 ${count} 筆更新`);
  return count;
}

async function updateLastBuildTime(time) {
  const [owner, repo] = process.env.GH_REPO.split('/');
  const path = `/repos/${owner}/${repo}/actions/variables/LAST_BUILD_TIME`;
  const body = { name: 'LAST_BUILD_TIME', value: time };
  const status = await githubRequest('PATCH', path, body);
  if (status === 404) {
    await githubRequest('POST', `/repos/${owner}/${repo}/actions/variables`, body);
  }
  console.log('LAST_BUILD_TIME 更新為:', time);
}

(async () => {
  try {
    const now = new Date().toISOString();
    const counts = await Promise.all(DBS.map(checkDB));
    const total = counts.reduce((a, b) => a + b, 0);

    if (total > 0) {
      console.log(`共 ${total} 筆更新，準備觸發 deploy...`);
      setOutput('has_updates', 'true');
      await updateLastBuildTime(now);
    } else {
      console.log('沒有更新，跳過 deploy。');
      setOutput('has_updates', 'false');
    }
  } catch (e) {
    console.error('錯誤:', e.message);
    process.exit(1);
  }
})();
