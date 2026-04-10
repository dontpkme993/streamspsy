<!-- AI 工具可直接讀取此檔案，依照「修改建議」區塊的代碼執行修正 -->

# AI 爬蟲健檢報告

| | |
|---|---|
| URL | https://dontpkme993.github.io/streamspsy/ |
| AEO Score | **30/100** (D) |
| Optimization Score | **0/100** |
| 允許 | 20/20 |
| Date | 2026-04-03 |

## 爬蟲狀態

| Crawler | Org | Status |
|---------|-----|--------|
| GPTBot | OpenAI | ✅ 可進入 |
| ChatGPT-User | OpenAI | ✅ 可進入 |
| OAI-SearchBot | OpenAI | ✅ 可進入 |
| ClaudeBot | Anthropic | ✅ 可進入 |
| Claude-SearchBot | Anthropic | ✅ 可進入 |
| Google-Extended | Google | ✅ 可進入 |
| Googlebot | Google | ✅ 可進入 |
| Bingbot | Microsoft | ✅ 可進入 |
| meta-externalagent | Meta | ✅ 可進入 |
| PerplexityBot | Perplexity | ✅ 可進入 |
| Applebot | Apple | ✅ 可進入 |
| Amazonbot | Amazon | ✅ 可進入 |
| Bytespider | ByteDance | ✅ 可進入 |
| xAI-Grok | xAI | ✅ 可進入 |
| MistralAI-User | Mistral | ✅ 可進入 |
| CohereBot | Cohere | ✅ 可進入 |
| Bravebot | Brave | ✅ 可進入 |
| YandexBot | Yandex | ✅ 可進入 |
| DuckDuckBot | DuckDuckGo | ✅ 可進入 |
| CCBot | Common Crawl | ✅ 可進入 |

## 基礎設施

| Item | Status |
|------|--------|
| robots.txt | ❌ (0) |
| sitemap.xml | ❌ (0) |
| lastmod | ❌ (0) |
| llms.txt | ❌ (0) |
| JSON-LD | ❌ (0) |
| LLMs-Txt directive | ❌ (0) |
| Sitemap directive | ❌ (0) |
| FAQ Schema | ❌ (0) |
| Homepage | ✅ (+5) |

## 修改建議

### 1. 沒有 robots.txt

```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

### 2. 沒有 sitemap.xml

```
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
</urlset>
```

### 3. 沒有 llms.txt

```
# 網站名稱

> 網站簡介

## 主要頁面

- [首頁](https://example.com/): 首頁說明
```

### 4. 沒有 JSON-LD 結構化資料

```
<script type="application/ld+json">
{"@type":"Organization","name":"公司名","url":"https://example.com"}
</script>
```

### 5. 沒有 FAQ Schema（FAQPage）

```
<script type="application/ld+json">
{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"問題","acceptedAnswer":{"@type":"Answer","text":"回答"}}]}
</script>
```

---

> 由 [和心村 AEO 爬蟲健檢](https://aeo.washinmura.jp/crawl-check) 生成
