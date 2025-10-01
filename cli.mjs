#!/usr/bin/env node
// cli.mjs
// 以 OpenAI Agents + MCP(Stdio) 直連本機 chrome-devtools-mcp。
// 會自動打開 Chrome（非 headless），到 YouTube 搜尋「廣告金曲」並播放一首輕鬆愉快的歌。
// 對話狀態(state)保存在記憶體中，於同一行程可延續。

import { Agent, run, MCPServerStdio } from '@openai/agents';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import dotenv from 'dotenv';

// 載入 .env 檔案
dotenv.config();

// 檢查 OPENAI_API_KEY 是否存在
if (!process.env.OPENAI_API_KEY) {
  console.error('錯誤：未設定 OPENAI_API_KEY，請在 .env 檔案中設定');
  process.exit(1);
}

const mcpServer = new MCPServerStdio({
  name: 'chrome-devtools',
  // 直接用 npx 啟動 chrome-devtools-mcp（首次呼叫工具時會拉起 Chrome）
  // 可在這裡加 flags：例如 '--headless'、'--viewport=1280x720'
  fullCommand: 'npx -y chrome-devtools-mcp@latest',
  cacheToolsList: true,
});

await mcpServer.connect();

const instructions = `
You are a browser automation agent controlling Chrome via the "chrome-devtools" MCP server.
Goal: Open YouTube, search for "廣告金曲", pick a light/upbeat song, and start playback.

Guidelines:
- Navigate to https://www.youtube.com using "navigate_page".
- Wait for key selectors (e.g., search box 'input#search') using "wait_for".
- Enter the query "廣告金曲" with "fill" and trigger search (e.g., press Enter or click 'button#search-icon-legacy').
- From the results, choose a video whose title/metadata suggests a light/cheerful mood (e.g., “輕鬆”, “快樂”, "愉快").
- Click the title/thumbnail to open the video page and ensure playback begins.
- If a cookie/consent dialog appears, accept and continue.
- If pre-roll ads appear, just ensure main playback will start; do not try to skip.
- Finally, summarize what you did and which video title you played.
`;

const agent = new Agent({
  name: 'Chrome Player',
  model: 'gpt-5-mini',
  instructions,
  mcpServers: [mcpServer],
});

// 記憶體內對話狀態
let state;

const argvText = process.argv.slice(2).join(' ').trim();
const firstTask = argvText || '前往 YouTube 搜尋「廣告金曲」，選一首輕鬆愉快的歌並播放。';

let result = await run(agent, firstTask);
state = result.state;
console.log('\n=== Agent Output ===\n' + result.finalOutput + '\n');

// 簡單 REPL：沿用同一個 state 繼續指令
const rl = createInterface({ input, output });
function ask() {
  rl.question('> 下一個指令（直接 Enter 結束）：', async (line) => {
    const text = line.trim();
    if (!text) {
      rl.close();
      await mcpServer.close();
      process.exit(0);
      return;
    }
    try {
      result = await run(agent, text, { state });
      state = result.state;
      console.log('\n=== Agent Output ===\n' + result.finalOutput + '\n');
    } catch (err) {
      console.error('Error:', err?.message || err);
    }
    ask();
  });
}
ask();
