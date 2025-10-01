#!/usr/bin/env node
// web/server.mjs
// Express + WebSocket 伺服器，提供 Web 控制台介面
// 提供通用的 AI 助手功能，並在需要時可以操作 Chrome 瀏覽器

import express from 'express';
import { WebSocketServer } from 'ws';
import { run } from '@openai/agents';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import {
  createAgent,
  createMCPServer,
  saveState,
  loadState,
  closeMCPServer,
  MAX_TURNS
} from '../cli-agent.mjs';

dotenv.config();

// 檢查 OPENAI_API_KEY
if (!process.env.OPENAI_API_KEY) {
  console.error('錯誤：未設定 OPENAI_API_KEY，請在 .env 檔案中設定');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 靜態檔案服務
app.use(express.static(join(__dirname, 'public')));

const server = app.listen(PORT, async () => {
  console.log(`🚀 Web 控制台啟動於 http://localhost:${PORT}`);
  console.log(`📊 最大回合數: ${MAX_TURNS}`);
  console.log('⏳ 正在初始化 Agent...');
  
  try {
    await initializeAgent();
    console.log('✓ AI 助手已就緒');
    console.log('   - 可以進行一般對話');
    console.log('   - 需要時會自動使用瀏覽器操作\n');
  } catch (err) {
    console.error('× 初始化失敗:', err);
    console.error('⚠️  伺服器已啟動但 Agent 無法使用');
  }
});

// WebSocket 伺服器
const wss = new WebSocketServer({ server });

// 全域 Agent 和 State
let agent = null;
let state = null;
let isInitialized = false;

/**
 * 初始化 Agent
 */
async function initializeAgent() {
  if (isInitialized) return;
  
  try {
    await createMCPServer();
    agent = await createAgent();
    state = await loadState();
    isInitialized = true;
    
    if (state) {
      console.log('✓ 已載入先前的對話狀態');
    }
  } catch (err) {
    console.error('× Agent 初始化失敗:', err);
    throw err;
  }
}

/**
 * 廣播訊息給所有連接的客戶端
 */
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
}

/**
 * 發送日誌訊息
 */
function sendLog(message, type = 'info') {
  broadcast({
    type: 'log',
    message,
    logType: type,
    timestamp: new Date().toISOString()
  });
}

// WebSocket 連接處理
wss.on('connection', (ws) => {
  console.log('✓ 新客戶端連接');
  
  // 發送歡迎訊息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '已連接到 Chrome MCP Agent 控制台',
    maxTurns: MAX_TURNS,
    hasState: state !== null
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'run') {
        const taskText = message.text?.trim();
        
        if (!taskText) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '請輸入訊息'
          }));
          return;
        }

        // 檢查 Agent 是否已初始化
        if (!isInitialized) {
          sendLog('× Agent 尚未初始化', 'error');
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Agent 尚未初始化，請稍後再試'
          }));
          return;
        }

        sendLog(`📝 收到訊息: ${taskText}`, 'info');
        sendLog('⏳ Agent 處理中...', 'info');

        try {
          // 執行任務
          const result = await run(agent, taskText, state ? { state } : {});
          state = result.state;
          
          // 保存狀態
          const saved = await saveState(state);
          if (saved) {
            sendLog('✓ 狀態已保存', 'success');
          }

          // 發送結果
          broadcast({
            type: 'result',
            output: result.finalOutput,
            success: true
          });

          sendLog('✅ 任務完成', 'success');

        } catch (err) {
          console.error('執行錯誤:', err);
          sendLog('❌ 執行錯誤: ' + err.message, 'error');
          
          broadcast({
            type: 'error',
            message: err.message
          });
        }
      }
      
    } catch (err) {
      console.error('訊息處理錯誤:', err);
      ws.send(JSON.stringify({
        type: 'error',
        message: '訊息處理錯誤: ' + err.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('✗ 客戶端斷線');
  });

  ws.on('error', (err) => {
    console.error('WebSocket 錯誤:', err);
  });
});

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('\n正在關閉伺服器...');
  await closeMCPServer();
  server.close(() => {
    console.log('伺服器已關閉');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  await closeMCPServer();
  server.close();
  process.exit(0);
});

