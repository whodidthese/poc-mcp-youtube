// app.js - WebSocket 客戶端邏輯

let ws = null;
let isRunning = false;

// DOM 元素
const taskInput = document.getElementById('taskInput');
const runBtn = document.getElementById('runBtn');
const spinner = document.getElementById('spinner');
const logContainer = document.getElementById('logContainer');
const outputContainer = document.getElementById('outputContainer');
const connectionStatus = document.getElementById('connectionStatus');
const maxTurnsEl = document.getElementById('maxTurns');
const stateStatusEl = document.getElementById('stateStatus');

/**
 * 建立 WebSocket 連接
 */
function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    updateConnectionStatus(true);
    addLog('✓ 已連接到伺服器', 'success');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (err) {
      console.error('解析訊息失敗:', err);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket 錯誤:', error);
    addLog('× WebSocket 連接錯誤', 'error');
  };

  ws.onclose = () => {
    updateConnectionStatus(false);
    addLog('× 與伺服器斷線', 'error');
    
    // 5秒後重新連接
    setTimeout(() => {
      addLog('⟳ 嘗試重新連接...', 'info');
      connect();
    }, 5000);
  };
}

/**
 * 更新連接狀態顯示
 */
function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.textContent = '● 已連接';
    connectionStatus.className = 'status-badge connected';
    runBtn.disabled = false;
  } else {
    connectionStatus.textContent = '○ 未連接';
    connectionStatus.className = 'status-badge disconnected';
    runBtn.disabled = true;
  }
}

/**
 * 處理伺服器訊息
 */
function handleMessage(data) {
  switch (data.type) {
    case 'connected':
      addLog(data.message, 'success');
      maxTurnsEl.textContent = data.maxTurns || '-';
      stateStatusEl.textContent = data.hasState ? '已載入' : '無';
      stateStatusEl.style.color = data.hasState ? '#10b981' : '#64748b';
      break;

    case 'log':
      addLog(data.message, data.logType);
      break;

    case 'result':
      isRunning = false;
      updateRunButton();
      outputContainer.textContent = data.output;
      addLog('✅ 任務執行完成', 'success');
      break;

    case 'error':
      isRunning = false;
      updateRunButton();
      addLog('❌ 錯誤: ' + data.message, 'error');
      outputContainer.textContent = '錯誤: ' + data.message;
      break;

    default:
      console.log('未知訊息類型:', data);
  }
}

/**
 * 新增日誌項目
 */
function addLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  
  const timestamp = new Date().toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span>${message}`;
  logContainer.appendChild(entry);
  
  // 自動捲動到底部
  logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * 更新執行按鈕狀態
 */
function updateRunButton() {
  if (isRunning) {
    runBtn.textContent = '處理中';
    runBtn.disabled = true;
    spinner.classList.add('active');
  } else {
    runBtn.textContent = '送出';
    runBtn.disabled = !ws || ws.readyState !== WebSocket.OPEN;
    spinner.classList.remove('active');
  }
}

/**
 * 執行任務
 */
function runTask(taskText) {
  if (!taskText || isRunning) return;
  
  isRunning = true;
  updateRunButton();
  
  addLog(`📝 提交訊息: ${taskText}`, 'info');
  
  ws.send(JSON.stringify({
    type: 'run',
    text: taskText
  }));
}

/**
 * 事件監聽
 */
runBtn.addEventListener('click', () => {
  const taskText = taskInput.value.trim();
  if (taskText) {
    runTask(taskText);
    taskInput.value = '';
  }
});

taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !isRunning) {
    const taskText = taskInput.value.trim();
    if (taskText) {
      runTask(taskText);
      taskInput.value = '';
    }
  }
});

// 快速指令按鈕
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const task = btn.getAttribute('data-task');
    if (task) {
      taskInput.value = task;
      runTask(task);
      taskInput.value = '';
    }
  });
});

// 啟動時自動連接
connect();

// 頁面載入完成後自動聚焦輸入框
taskInput.focus();

