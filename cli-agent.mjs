// cli-agent.mjs
// 共用的 Agent 建立邏輯，供 CLI 和 Web 面板使用

import { Agent, MCPServerStdio } from '@openai/agents';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const STATE_FILE = './storage/state.json';
const SCHEMA_VERSION = 1;

// 讀取設定
export const MAX_TURNS = parseInt(process.env.MAX_TURNS || '25', 10);

// Agent 指令
const instructions = `
You are a helpful AI assistant with browser automation capabilities via Chrome DevTools MCP.

Your primary role is to help users with:
1. **General conversation**: Answer questions, provide information, assist with various tasks
2. **Web browsing**: When users need to interact with websites, you can control Chrome browser

Browser Automation Guidelines (when needed):
- Use "navigate_page" to visit URLs
- Use "wait_for" to wait for page elements to load
- Use "fill" to enter text into input fields
- Use "click" to interact with page elements
- Use "take_screenshot" to capture the current page
  * **IMPORTANT**: ALWAYS use the filePath parameter when taking screenshots
  * Save screenshots to: ./storage/screenshot-<timestamp>.png (use current timestamp)
  * Example filePath: "./storage/screenshot-20250101-153045.png"
  * After screenshot is saved, ALWAYS tell the user the complete file path
  * Example response: "已截圖完成，檔案儲存於：./storage/screenshot-20250101-153045.png"
- For Taiwanese users: prefer URLs with &hl=zh-TW&gl=TW parameters when applicable
- Handle cookie/consent dialogs appropriately
- Be patient with page loading and dynamic content

Important Rules:
- Only use browser tools when the user's request clearly requires web interaction
- For simple questions or conversations, respond directly without opening the browser
- Always explain what you're doing when using browser automation
- If a website requires specific actions (login, navigation), guide the user through it
- Summarize your actions and results clearly
- When taking screenshots, ALWAYS inform the user of the saved file location

Language Preference:
- Respond in Traditional Chinese (繁體中文) by default
- For web content, prefer Taiwan region settings when available
`;

let mcpServerInstance = null;
let agentInstance = null;

/**
 * 建立並連接 MCP 伺服器
 */
export async function createMCPServer() {
	if (mcpServerInstance) {
		return mcpServerInstance;
	}

	mcpServerInstance = new MCPServerStdio({
		name: 'chrome-devtools',
		// fullCommand: 'npx -y chrome-devtools-mcp@latest --lang=zh-TW',
		fullCommand: 'npx -y chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222 --lang=zh-TW',
		cacheToolsList: true,
	});

	await mcpServerInstance.connect();
	return mcpServerInstance;
}

/**
 * 建立 Agent
 */
export async function createAgent() {
	if (agentInstance) {
		return agentInstance;
	}

	const mcpServer = await createMCPServer();

	agentInstance = new Agent({
		name: 'Chrome Player',
		model: 'gpt-5-mini',
		instructions,
		mcpServers: [mcpServer],
		maxTurns: MAX_TURNS,
	});

	return agentInstance;
}

/**
 * 保存狀態到檔案
 */
export async function saveState(state) {
	try {
		if (!existsSync('./storage')) {
			await mkdir('./storage', { recursive: true });
		}
		const data = {
			schemaVersion: SCHEMA_VERSION,
			timestamp: new Date().toISOString(),
			state: state
		};
		// 先寫臨時檔，完成後替換（防止損毀）
		const tmpFile = STATE_FILE + '.tmp';
		await writeFile(tmpFile, JSON.stringify(data, null, 2));
		await writeFile(STATE_FILE, JSON.stringify(data, null, 2));
		return true;
	} catch (err) {
		console.error('× 保存狀態失敗:', err?.message);
		return false;
	}
}

/**
 * 從檔案載入狀態
 */
export async function loadState() {
	try {
		if (!existsSync(STATE_FILE)) {
			return null;
		}
		const raw = await readFile(STATE_FILE, 'utf-8');
		const data = JSON.parse(raw);

		// 檢查版本相容性
		if (data.schemaVersion !== SCHEMA_VERSION) {
			console.log(`⚠ 狀態檔版本不符（${data.schemaVersion} vs ${SCHEMA_VERSION}），將忽略`);
			return null;
		}

		return data.state;
	} catch (err) {
		console.error('× 載入狀態失敗:', err?.message);
		return null;
	}
}

/**
 * 關閉 MCP 伺服器
 */
export async function closeMCPServer() {
	if (mcpServerInstance) {
		await mcpServerInstance.close();
		mcpServerInstance = null;
		agentInstance = null;
	}
}

