#!/usr/bin/env node
// cli.mjs
// 以 OpenAI Agents + MCP(Stdio) 直連本機 chrome-devtools-mcp。
// 提供通用的 AI 助手功能，並在需要時可以操作 Chrome 瀏覽器。
// 對話狀態(state)保存在記憶體中，於同一行程可延續。

import { run } from '@openai/agents';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import dotenv from 'dotenv';
import { 
  createAgent, 
  createMCPServer, 
  saveState, 
  loadState, 
  closeMCPServer 
} from './cli-agent.mjs';

// 載入 .env 檔案
dotenv.config();

// 檢查 OPENAI_API_KEY 是否存在
if (!process.env.OPENAI_API_KEY) {
  console.error('錯誤：未設定 OPENAI_API_KEY，請在 .env 檔案中設定');
  process.exit(1);
}

// 初始化
console.log('🚀 正在啟動 AI 助手...');
await createMCPServer();
const agent = await createAgent();
console.log('✓ Agent 初始化完成');
console.log('✓ Chrome DevTools MCP 已連接\n');

// 記憶體內對話狀態
let state = await loadState();
if (state) {
  console.log('✓ 已載入先前的對話狀態\n');
}

// 顯示歡迎訊息
console.log('💬 AI 助手已就緒！');
console.log('   - 可以進行一般對話');
console.log('   - 需要時會自動使用瀏覽器操作');
console.log('   - 輸入空白行結束程式\n');

// 簡單 REPL：沿用同一個 state 繼續指令
const rl = createInterface({ input, output });
function ask() {
  rl.question('> 你的訊息（直接 Enter 結束）：', async (line) => {
    const text = line.trim();
    if (!text) {
      rl.close();
      await closeMCPServer();
      process.exit(0);
      return;
    }
    try {
      const result = await run(agent, text, { state });
      state = result.state;
      const saved = await saveState(state);
      if (saved) {
        console.log('✓ 狀態已保存');
      }
      console.log('\n=== Agent Output ===\n' + result.finalOutput + '\n');
    } catch (err) {
      console.error('Error:', err?.message || err);
    }
    ask();
  });
}
ask();
