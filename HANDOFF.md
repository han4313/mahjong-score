# 麻將計分：換電腦接手說明

- GitHub：https://github.com/han4313/mahjong-score （main 分支）
- 線上網址：https://mahjong-score-dfom.onrender.com/
- 贊助：Ko-fi `https://ko-fi.com/han43`（設定在 `src/config.js`）

## 在新電腦開始

1. 安裝 Git 與 Node 18 以上（建議 20）。如果電腦上有別的專案依賴舊版 Node，可以下載可攜式 Node，不要動全域版本。
2. `git clone https://github.com/han4313/mahjong-score.git`
3. `cd mahjong-score` → `npm install`
4. 開發：`npm run dev`（前端，埠 5173，會代理 `/api` 到 3001）＋ `node server/index.js`（後端，埠 3001）
5. 建置：`npm run build`（會先 vite build，再產生 `dist/` 裡的內容頁、sitemap、robots）
6. 測試：`npm test`（目前 31 項）
7. 模擬正式環境：`npm run build` 後 `node server/index.js`，開 http://localhost:3001/

## 部署

推到 GitHub 的 main，Render 會自動部署（設定在 `render.yaml`）。
環境變數：`SITE_URL`（換網域後要設，影響 sitemap 與 canonical）、`PORT`、`DATA_DIR`、`TRUST_PROXY`（Render 會自動偵測）。

## 目錄

| 路徑 | 內容 |
|---|---|
| `src/` | Vue 前端；`store.js` 是資料與同步中心，`scoring.js` 計分，`settle.js` 結算，`defaults.js` 預設台數表 |
| `server/index.js` | 零依賴 Node 伺服器：靜態檔、房號 API、統計 API |
| `server/games.js` | 6 款朋友小遊戲的規則（伺服器端判定，祕密不外洩） |
| `scripts/` | 建置時產生 SEO 內容頁 |
| `public/` | 原樣複製到網站根目錄（含 Google 驗證檔，不可刪） |
| `tests/` | 單元測試 |

## 待辦

- 買自己的網域後：Render 加 Custom Domain、設 DNS、設 `SITE_URL`、Search Console 重新驗證並提交 sitemap。
- Search Console 的 sitemap 狀態曾顯示「無法擷取」，網站端已確認正常，等 Google 重新抓取。
- 廣告暫時不做。
- 即時人數／房間數統計存在記憶體，休眠後歸零，不適合當正式統計。

## 注意

- `data/`、`dist/`、`node_modules/`、`.tools/` 不在 git 裡。
- 房號沒有密碼，知道房號的人都能修改。
- Render 免費方案：閒置 15 分鐘休眠、檔案系統不保留。**不要用定時 ping 保持清醒**（Render 視為濫用）。
