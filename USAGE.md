# 使用指南

## 快速開始

### 1️⃣ 環境設定

```bash
# 複製環境變數範本
cp .env.sample .env

# 編輯 .env 檔案，設定你的 OpenAI API Key
# OPENAI_API_KEY=sk-...
# MAX_TURNS=25  （可選，預設 25）
```

### 2️⃣ 安裝依賴

```bash
npm install
```

### 3️⃣ 選擇執行模式

#### 🖥️ CLI 模式（命令列）

適合開發測試或偏好命令列介面的使用者：

```bash
npm run cli
```

或直接執行：
```bash
node cli.mjs
```

**功能**：
- 互動式命令列介面（REPL）
- 可以連續輸入多個訊息
- 對話狀態自動保存
- 按 Enter 鍵（空白輸入）結束程式
- 啟動時自動初始化 Agent 和 Chrome

**範例**：
```
🚀 正在啟動 AI 助手...
✓ Agent 初始化完成
✓ Chrome DevTools MCP 已連接

💬 AI 助手已就緒！
   - 可以進行一般對話
   - 需要時會自動使用瀏覽器操作
   - 輸入空白行結束程式

> 你的訊息（直接 Enter 結束）：你好，你能做什麼？
=== Agent Output ===
你好！我是一個 AI 助手，我可以：
1. 回答各種問題和提供資訊
2. 當需要時，我可以操作 Chrome 瀏覽器...

> 你的訊息（直接 Enter 結束）：前往 Google 搜尋 OpenAI
=== Agent Output ===
好的，我正在為你打開 Google 並搜尋 OpenAI...
[Agent 自動操作瀏覽器]
...
```

#### 🌐 Web 模式（瀏覽器控制台）

適合圖形化操作和監控：

```bash
npm run web
# 或
npm start
```

然後開啟瀏覽器前往：
```
http://localhost:3000
```

**功能**：
- 美觀的圖形化介面
- 即時顯示執行日誌
- 快速指令按鈕
- 連線狀態監控
- 執行結果區塊顯示

**介面說明**：
- **對話與操作區**：輸入訊息並點擊「送出」
- **快速範例**：預設了常用範例（包含對話和瀏覽器操作），點擊即可快速執行
- **執行日誌**：即時顯示 Agent 的執行步驟
- **執行結果**：顯示最終輸出結果
- **狀態資訊**：顯示連線狀態、MAX_TURNS、是否有保存狀態

## 常用指令範例

### 一般對話
```
你好，你能做什麼？
什麼是 Model Context Protocol？
解釋一下 AI Agents 的概念
給我一些學習程式設計的建議
```

### 網頁瀏覽
```
前往 https://www.google.com
前往 Google 搜尋今天的新聞
打開 https://github.com/trending
前往 https://tw.yahoo.com
```

### 資訊搜尋
```
幫我搜尋 OpenAI 的最新消息
前往 Google 搜尋「Model Context Protocol」
查詢 BTC 目前的價格（需要指定網站）
```

### 截圖與操作
```
幫我截圖目前的頁面
前往 https://example.com 並截圖
點擊頁面上的登入按鈕（需要先打開網頁）
```

**截圖說明**：
- 截圖會自動保存到 `./storage/screenshot-<時間戳>.png`
- Agent 會在回覆中告知完整的檔案儲存位置
- 檔案名稱包含時間戳記，不會覆蓋舊的截圖

### 混合使用
```
幫我搜尋 OpenAI，然後總結搜尋結果
前往 GitHub trending，告訴我有什麼有趣的專案
```

## 進階設定

### 環境變數

在 `.env` 檔案中可設定：

```env
# 必填
OPENAI_API_KEY=sk-your-api-key-here

# 可選（有預設值）
MAX_TURNS=25          # Agent 最大執行回合數
SERVICE_PORT=3000     # Web 伺服器埠號
```

### 持久記憶

所有對話狀態會自動保存在 `storage/state.json`，包含：
- 對話歷史
- 瀏覽器狀態
- 執行上下文

**特色**：
- ✅ 自動保存：每次執行後自動保存
- ✅ 自動載入：啟動時自動恢復
- ✅ 版本控制：不同版本的狀態檔不會互相影響
- ✅ 損毀防護：使用臨時檔案寫入策略

**清除狀態**：
```bash
rm -rf storage/state.json
# 或刪除整個 storage 目錄
```

### Chrome 設定

Chrome 會以以下設定啟動（設計理由與策略見 `README.MD`）：
- 語言：`zh-TW`（繁體中文）
- 非 headless 模式（可看到瀏覽器視窗）
- YouTube 搜尋自動加上 `&hl=zh-TW&gl=TW` 參數

### 截圖功能

截圖功能的詳細說明：
- **儲存位置**：所有截圖保存在 `./storage/` 目錄
- **檔案命名**：`screenshot-<時間戳>.png`（例如：`screenshot-20250101-153045.png`）
- **自動通知**：Agent 會在回覆中告知完整的檔案路徑
- **格式支援**：預設為 PNG 格式
- **範例回覆**：「已截圖完成，檔案儲存於：./storage/screenshot-20250101-153045.png」

## 疑難排解

### 問題：`Error: Max turns (10) exceeded`

**解決方式**：
在 `.env` 檔案中增加 `MAX_TURNS` 的值：
```env
MAX_TURNS=30
```

預設值為 25，可根據需要調整。

### 問題：Chrome 沒有啟動

**可能原因**：
1. `chrome-devtools-mcp` 套件未正確安裝
2. 系統沒有安裝 Chrome 瀏覽器

**解決方式**：
```bash
# 手動安裝 chrome-devtools-mcp
npx -y chrome-devtools-mcp@latest
```

### 問題：Web 模式無法連接

**檢查項目**：
1. 確認伺服器有正常啟動
2. 檢查埠號是否被佔用
3. 查看終端機的錯誤訊息

**解決方式**：
```bash
# 使用不同的埠號
SERVICE_PORT=3001 npm run web
```

### 問題：狀態檔損毀

**解決方式**：
```bash
# 刪除損毀的狀態檔
rm storage/state.json
rm storage/state.json.tmp

# 重新啟動程式
npm run cli  # 或 npm run web
```

---

返回：`README.MD`（專案結構、設計說明、技術堆疊、開發建議、Roadmap、延伸閱讀參考資料）

