// bootstrap-chrome-mcp.mjs
// 目的：在 macOS 上以「非預設 user-data-dir」啟動可附著的 Chrome（開 9222）
// 步驟：1) 驗 OS  2) 建目錄  3) open -na 啟 Chrome  4) 等待端點  5) fetch 測試  6) 顯示結果

import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.MCP_DEVTOOLS_PORT || 9222);

const USER_DATA_DIR = process.env.MCP_USER_DATA_DIR || path.join(os.homedir(), '.cache', 'chrome-mcp'); 
// 可改成 "~/Library/Application Support/chrome-mcp"
// --user-data-dir="$HOME/Library/Application Support/chrome-mcp"

const PROFILE_DIR = process.env.MCP_PROFILE_DIR || 'Default';
const TIMEOUT_MS = Number(process.env.MCP_READY_TIMEOUT || 15000);

function log(msg) { console.log(`[chrome-mcp] ${msg}`); }
function err(msg) { console.error(`[chrome-mcp] ${msg}`); }

async function verifyMacOS() {
  if (process.platform !== 'darwin') {
    throw new Error('此腳本僅支援 macOS（darwin）。');
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
  log(`user-data-dir 已就緒：${dir}`);
}

async function isDevtoolsUp(port) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 1500);
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: ac.signal
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function openChrome({ port, userDataDir, profileDirectory }) {
  // 使用 open -na「新實例」強制讓旗標生效；綁定 127.0.0.1 以免外部連線
  const args = [
    '-na', 'Google Chrome',
    '--args',
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    `--profile-directory=${profileDirectory}`,
    '--no-first-run',
    '--no-default-browser-check'
  ];
  log(`啟動 Chrome：open ${args.join(' ')}`);
  await execFileAsync('open', args);
}

async function waitUntilReady(port, timeoutMs) {
  log(`等待 DevTools 端點就緒（:${port}，timeout=${timeoutMs}ms）...`);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await isDevtoolsUp(port)) return true;
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

async function fetchVersion(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!res.ok) throw new Error(`狀態碼 ${res.status}`);
  return res.json();
}

async function main() {
  // 1) 檢查作業系統
  await verifyMacOS();
  log('作業系統：macOS OK');

  // 2) 檢查/建立 user-data-dir
  await ensureDir(USER_DATA_DIR);

  // 3) 建立或啟動 Default profile 的 Chrome（可附著）
  // 先嘗試是否已經在聆聽（避免重複開）
  if (!(await isDevtoolsUp(PORT))) {
    log('端點尚未就緒，嘗試啟動 Chrome...');
    await openChrome({ port: PORT, userDataDir: USER_DATA_DIR, profileDirectory: PROFILE_DIR });
  } else {
    log(`偵測到已有 Chrome 在 :${PORT} 聆聽，略過啟動。`);
  }

  // 4) 等待啟動
  const ready = await waitUntilReady(PORT, TIMEOUT_MS);
  if (!ready) {
    throw new Error(`等待超時：無法連線 http://127.0.0.1:${PORT}/json/version`);
  }

  // 5) 發送 fetch 測試
  const ver = await fetchVersion(PORT);

  // 6) 顯示結果
  log('✅ 連線成功！版本資訊：');
  console.log(JSON.stringify({
    Browser: ver.Browser,
    ProtocolVersion: ver['Protocol-Version'],
    WebSocketDebuggerUrl: ver.webSocketDebuggerUrl
  }, null, 2));
  log('你現在可以用 --browserUrl=http://127.0.0.1:' + PORT + ' 讓 MCP 附著。');
}

main().catch(e => {
  err(e?.message || String(e));
  process.exit(1);
});
