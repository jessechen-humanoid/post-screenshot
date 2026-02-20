# Social Post Screenshot Design

## Goal
建立一個可在 Zeabur 部署的 Web 應用，讓使用者貼入 Facebook / Instagram / Threads 公開貼文 URL，系統以手機 viewport 擷取每篇貼文內容區域，並提供 ZIP 下載。

## Scope
- 僅支援公開貼文
- 若偵測到登入牆或登入畫面，該筆任務標記失敗，不輸出截圖
- 單次批次處理量 20-200 URLs
- 預設 worker 併發數為 4

## Non-goals
- 不支援 private posts
- 不整合帳號登入流程
- 不做分散式多節點檔案共享（MVP 先單服務）

## Architecture
- Frontend: 最小 UI（貼上 URL、建立 Job、輪詢進度、下載 ZIP）
- API: 建立批次 job、查詢 job 狀態、下載結果
- Worker: BullMQ worker（同服務內啟動），以 Playwright 渲染頁面並執行 element-level screenshot
- Queue/State: Redis 儲存 job metadata、每筆 URL 狀態
- Storage: 本機工作目錄 `data/jobs/<jobId>/` 暫存 PNG 與 ZIP

## Screenshot Strategy
1. 使用手機 viewport（iPhone 尺寸）
2. 前往 URL 後等待主要內容渲染
3. 平台化 selector 策略定位貼文容器
4. 使用 `elementHandle.screenshot()`，避免全頁截圖
5. 失敗分類：`LOGIN_WALL`, `UNSUPPORTED_URL`, `POST_NOT_FOUND`, `TIMEOUT`, `UNKNOWN`

## Login Wall Guard
透過 URL pattern、頁面 title 與可見文字關鍵字檢查登入牆。
命中後直接回報 `LOGIN_WALL`，不儲存截圖。

## Data Flow
1. 使用者貼 URL 清單並送出
2. API 建立 job、正規化 URL、逐筆 enqueue
3. Worker 平行處理 URL（concurrency=4）
4. 每筆完成後更新 job counters
5. 全部完成時打包 ZIP
6. 前端可下載 ZIP 與檢視每筆結果

## Testing Focus
- URL 平台辨識
- 登入牆偵測規則
- Selector fallback 策略
- API 輸入驗證與狀態回傳

## Risks
- 社群平台 DOM 結構變動導致 selector 失效
- 同服務本機檔案在容器重啟後不保留
- 反爬限制導致偶發 timeout

## Mitigations
- 每平台採多 selector fallback
- 明確錯誤碼與可重試
- 設定 page timeout、捕捉錯誤並持續處理批次
