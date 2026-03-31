  程式碼架構

  streamspsy/
  ├── src/
  │   ├── _includes/
  │   │   ├── base.njk        # 共用 HTML 結構
  │   │   ├── nav.njk         # 導覽列
  │   │   └── footer.njk      # 頁尾
  │   ├── _data/
  │   │   ├── articles.js     # 呼叫 adapter 取文章
  │   │   └── events.js       # 呼叫 adapter 取活動
  │   ├── adapters/
  │   │   └── notion.js       # 所有 Notion 邏輯集中在這
  │   ├── assets/
  │   │   └── styles.css
  │   ├── index.njk           # 首頁
  │   ├── about.njk
  │   ├── article.njk         # 文章內頁（逐篇產生）
  │   ├── articles.njk        # 文章列表
  │   ├── events.njk
  │   ├── media.njk
  │   └── cards.njk
  ├── .github/
  │   ├── workflows/
  │   │   └── notion-deploy.yml   # 排程偵測 Notion 更新
  │   └── scripts/
  │       └── check-notion.js     # 偵測邏輯
  ├── .eleventy.js            # 11ty 設定
  └── netlify.toml            # Netlify build 設定

  ---
  服務與環境變數

  本地開發（.env，不進 git）

  ┌────────────────────┬──────────────────────────┐
  │        變數        │           用途           │
  ├────────────────────┼──────────────────────────┤
  │ NOTION_TOKEN       │ Notion Integration Token │
  ├────────────────────┼──────────────────────────┤
  │ NOTION_ARTICLES_DB │ 專欄文章 DB ID           │
  ├────────────────────┼──────────────────────────┤
  │ NOTION_EVENTS_DB   │ 諮商講座 DB ID           │
  └────────────────────┴──────────────────────────┘

  ---
  Netlify（Site configuration → Environment variables）

  ┌────────────────────┬─────────────────────────┐
  │        變數        │          用途           │
  ├────────────────────┼─────────────────────────┤
  │ NOTION_TOKEN       │ build 時呼叫 Notion API │
  ├────────────────────┼─────────────────────────┤
  │ NOTION_ARTICLES_DB │ 文章 DB ID              │
  ├────────────────────┼─────────────────────────┤
  │ NOTION_EVENTS_DB   │ 活動 DB ID              │
  └────────────────────┴─────────────────────────┘

  ---
  GitHub（Settings → Secrets and variables → Actions）

  ┌──────────┬────────────────────┬─────────────────────────────────┐
  │   類型   │        名稱        │              用途               │
  ├──────────┼────────────────────┼─────────────────────────────────┤
  │ Secret   │ NOTION_TOKEN       │ 查詢 Notion DB                  │
  ├──────────┼────────────────────┼─────────────────────────────────┤
  │ Secret   │ NOTION_ARTICLES_DB │ 文章 DB ID                      │
  ├──────────┼────────────────────┼─────────────────────────────────┤
  │ Secret   │ NOTION_EVENTS_DB   │ 活動 DB ID                      │
  ├──────────┼────────────────────┼─────────────────────────────────┤
  │ Secret   │ NETLIFY_BUILD_HOOK │ 觸發 Netlify build              │
  ├──────────┼────────────────────┼─────────────────────────────────┤
  │ Secret   │ GH_TOKEN           │ 更新 LAST_BUILD_TIME            │
  ├──────────┼────────────────────┼─────────────────────────────────┤
  │ Variable │ LAST_BUILD_TIME    │ 上次 build 時間戳記（自動更新） │
  └──────────┴────────────────────┴─────────────────────────────────┘

  ---
  部署流程

  Notion 編輯內容
        ↓
  GitHub Actions 每小時偵測（或手動觸發）
        ↓ 有變動
  POST https://api.netlify.com/build_hooks/69cad309a6a79f9059c1449c
        ↓
  Netlify 執行 npm run build（11ty + Notion API）
        ↓
  靜態 HTML 部署到 CDN
        ↓
  https://beautiful-pastelito-e7737d.netlify.app






  ● 關聯與權限設定總覽

  Notion

  Integration 設定（https://www.notion.so/my-integrations）
  - 建立 Integration 名稱：溪水邊
  - Capability 開啟：Read content

  Database 連接（每個 DB 頁面 → ⋯ → Connections）
  - 專欄文章 DB → 連接「溪水邊」Integration
  - 諮商講座 DB → 連接「溪水邊」Integration

  ---
  GitHub

  Repository Secrets（Settings → Secrets and variables → Actions → Secrets）
  - 存放 5 個 secrets（NOTION_TOKEN、兩個 DB ID、NETLIFY_BUILD_HOOK、GH_TOKEN）

  GH_TOKEN 權限（Settings → Developer settings → Fine-grained tokens）
  - Repository：streamspsy
  - Permission：Actions variables → Read and write

  ---
  Netlify

  GitHub 連接（建立 site 時授權）
  - 授權 Netlify 讀取 GitHub repo streamspsy
  - 每次 push 到 main 自動 build

  Environment variables
  - 設定 3 個變數（NOTION_TOKEN、兩個 DB ID）

  Build Hook
  - 建立 Notion Publish hook，提供 POST URL 給 GitHub Actions 使用

  ---
  關聯圖

  GitHub repo
    ├── 授權 Netlify 讀取 → Netlify 自動 build on push
    └── GitHub Actions
          ├── 用 NOTION_TOKEN 查詢 Notion DB
          └── 用 NETLIFY_BUILD_HOOK 觸發 Netlify build

  Notion Integration「溪水邊」
    ├── 連接「專欄文章」DB
    └── 連接「諮商講座」DB