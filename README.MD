# AI 助手 with Chrome MCP

結合 OpenAI Agents 與 Chrome DevTools MCP 的通用 AI 助手，可以進行一般對話，並在需要時自動操作 Chrome 瀏覽器。

## 快速開始

### 1. 設定環境

複製 `.env.sample` 為 `.env` 並設定你的 API Key：

```bash
cp .env.sample .env
# 編輯 .env 填入 OPENAI_API_KEY
```

### 2. 安裝相依套件

```bash
npm install
```

### 3. 執行方式

**CLI 模式**（命令列互動）：
```bash
npm run cli
# 或: node cli.mjs
```

**Web 模式**（瀏覽器控制台）：
```bash
npm run web
# 或: npm start
# 開啟瀏覽器前往 http://localhost:3000
```

## 功能特色

- ✅ **通用對話**：可進行一般 AI 對話，回答問題、提供建議
- ✅ **智能判斷**：Agent 自動判斷何時需要使用瀏覽器工具
- ✅ **瀏覽器操作**：需要時自動操作 Chrome（開啟網頁、搜尋、截圖等）
- ✅ **持久記憶**：對話狀態自動保存，跨行程記憶
- ✅ **繁中優化**：預設使用繁體中文回應，網頁操作偏好台灣地區
- ✅ **Web 控制台**：美觀的圖形化介面，即時日誌顯示
- ✅ **可調整參數**：透過 `.env` 設定 MAX_TURNS（預設 25）

## 設定說明

在 `.env` 檔案中可設定：

```env
OPENAI_API_KEY=your_api_key_here
MAX_TURNS=25          # Agent 最大執行回合數（預設 25）
PORT=3000            # Web 伺服器埠號（預設 3000）
```

## 專案結構

```
├── cli.mjs              # CLI 命令列介面
├── cli-agent.mjs        # 共用 Agent 邏輯
├── web/
│   ├── server.mjs       # Express + WebSocket 伺服器
│   └── public/
│       ├── index.html   # Web 控制台介面
│       └── app.js       # WebSocket 客戶端
├── storage/             # 狀態檔案儲存目錄
└── .env                 # 環境變數設定
```

## Reference

 - https://modelcontextprotocol.io/docs/getting-started/intro
 - https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md


## Todo List
---

# 1) 精簡 Web 面板（Express + WebSocket）

* [x] 建立檔案結構

  * `web/server.mjs`（Express + WS；橋接 CLI Agent）
  * `web/public/index.html`（極簡控制台）
  * `web/public/app.js`（與 WS 溝通）
* [x] 在 `server.mjs` 中：

  * [x] 啟動 `Express` 靜態網站：`/` 服務 `public`
  * [x] 啟動 `WebSocket` 伺服器（例如 `ws` 套件）
  * [x] 從 WS 收到 `{type:'run', text:'...'}` 時 → 呼叫你現有的 `Agent + run()`（沿用同一個 `Agent` 與 `state`）
  * [x] 透過 WS 把**即時日誌**（工具呼叫/關鍵步驟）與**最終輸出**回推前端
* [x] 在 `index.html`：

  * [x] 一個輸入框（任務指令）＋「執行」按鈕
  * [x] 一個滾動的 log 區（顯示步驟、當前 URL、選到的影片標題）
* [x] 把 CLI 的 `readline` 互動邏輯抽成函式，讓 `server.mjs` 也能共用（例如 `import { createAgent } from '../cli-agent.mjs'`）。
* [x] 起服務：

  ```bash
  npm i express ws
  npm run web
  # 或直接: node web/server.mjs
  # 瀏覽 http://localhost:3000
  ```

---

# 2) 語系與地區參數（YT 結果偏繁中、台灣）

* [x] **Chrome 語系**：啟動 MCP 時帶 `--lang=zh-TW`

  * 在 `fullCommand` 加上：`chrome-devtools-mcp@latest --lang=zh-TW`
* [ ] **Accept-Language**：首次載入後用 `evaluate` 設定（若 MCP 有 `evaluate`/`set_user_agent` 類工具則用之；否則改用 URL 參數為主）。
* [x] **YouTube 參數**：搜尋或結果頁加 `&hl=zh-TW&gl=TW`

  * 例如：`https://www.youtube.com/results?search_query=廣告金曲&hl=zh-TW&gl=TW`
* [x] **時區/地區一致性**：必要時在指令中提醒代理「偏好繁體中文與台灣地區結果」。
* [x] **前置腳本**：在 `instructions` 中加入：

  * 「若已在 youtube.com，先嘗試把 URL 改寫附帶 `hl=zh-TW&gl=TW` 再搜尋。」
  * 「若有地區/語言彈窗，優先選擇台灣／繁中。」

---

# 3) 持久記憶（跨行程保存 state）

* [x] 建立 `storage/state.json`
* [x] **啟動時讀取**：若檔案存在就還原 `state`（例如 `AgentState.fromJSON(json)`；如果 SDK 沒直接方法，就保存你 `run()` 回來的 `state.serialize()` 結果，再用 `agent.resume(serialized)` 或 `agent.start` + `forkWithUserInput` 作近似還原）
* [x] **每次 run 後保存**：

  ```js
  import { writeFile, readFile } from 'node:fs/promises';

  async function saveState(state) {
    const data = state?.toJSON ? state.toJSON() : state; // 依 SDK 提供方法
    await writeFile('./storage/state.json', JSON.stringify(data));
  }

  async function loadState() {
    try {
      const raw = await readFile('./storage/state.json', 'utf-8');
      return JSON.parse(raw); // 視 SDK 需要轉回 State
    } catch { return null; }
  }
  ```
* [x] **版本相容性**：加入 `schemaVersion` 欄位；若版本不符就忽略舊檔。
* [x] **損毀防護**：寫入前先寫臨時檔 `state.json.tmp`，完成後替換。

---

# 4) 如果需要登入（Google/YouTube）

> 強烈建議使用 **持久化 Chrome 使用者資料夾**，手動登入一次即可長期維持，減少自動化登入風險與 2FA 阻塞。

* [ ] **為 MCP 指定使用者資料**：

  * 在 `fullCommand` 增加：

    * `--user-data-dir="<你的路徑>/chrome-profile-mcp"`
    * `--profile-directory="Default"`（或自訂）
  * 例：

    ```
    npx -y chrome-devtools-mcp@latest \
      --lang=zh-TW \
      --user-data-dir="$HOME/.mcp-chrome" \
      --profile-directory="Profile 1"
    ```
* [ ] **第一次啟動**：

  * [ ] 讓代理 `navigate_page` 到 `https://www.youtube.com`，你**手動**完成 Google 登入（含 2FA）
  * [ ] 成功後關閉與重開一次，確認 cookie 與登入狀態已持久化
* [ ] **權限與安全**：

  * [ ] **不要**在程式碼中存 Google 密碼
  * [ ] 把使用者資料夾設為**專用**（給 MCP），避免與個人常用 Chrome 資料混用
  * [ ] 若放到伺服器：確保該資料夾權限與磁碟加密
* [ ] **登入檢測**：

  * [ ] 在每次任務開頭用 `evaluate` 檢查頁面是否顯示使用者頭像／`yt-simple-endpoint[aria-label*="帳戶"]` 等
  * [ ] 若未登入：Web 面板提示「需要登入」，並提供「打開 YouTube 帳戶頁」按鈕（由代理 `navigate_page` 開頁，等待你手動完成）

---

## 參考執行順序建議

1. **Web 面板**（server + WS + 簡單前端），把既有 `Agent` 串上
2. 在 MCP `fullCommand` 加上 `--lang=zh-TW`，搜尋 URL 改加 `hl/gl`
3. 實作 **持久記憶**（state.json 讀寫）
4. 補 **錯誤復原**：多組 selector、重試、降級 URL、錯誤訊息回推前端
5. 配置 **登入** 的使用者資料夾，手動登入一次並驗證持久化

