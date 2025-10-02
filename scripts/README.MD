## 為何不能直接用「預設 Chrome 個人資料夾」開遠端除錯？

* **安全限制**：新版 Chrome 規定，**啟用 DevTools Remote Debugging（`--remote-debugging-port`）時，不得使用「預設的 user-data 目錄」**（例如 macOS 的 `~/Library/Application Support/Google/Chrome`）。
  目的：避免外部程式在你**日常登入的個人 Profile**（含 cookies/密鑰/擴充套件）上取得**完整遠端控制**。

* **表徵**：啟動時會出現訊息
  `DevTools remote debugging requires a non-default data directory. Specify this using --user-data-dir.`
  之後 `curl 127.0.0.1:9222/json/version` 無法連線。

* **macOS 還有一個坑**：如果 Chrome 已在背景執行，**直接再啟動不會套用旗標**，所以即使你加了 `--remote-debugging-port` 也等於沒開。要用 `open -na` 強制新實例。

### 正確做法(摘要)

1. 用**非預設**的 user-data 目錄(專用自動化 Profile)
2. 綁本機位址、開新實例
3. 再讓 MCP 以 `--browserUrl` 附著

```bash
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$HOME/Library/Application Support/chrome-mcp" \
  --profile-directory="Default" \
  --no-first-run --no-default-browser-check
# 然後：
# npx chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222
```

> 好處：把自動化與日常瀏覽**隔離**；降低風險、避免旗標被忽略，MCP 才能穩定附著與控制瀏覽器。
