# STW-24：本機 OpenAPI Mock API 情境服務

## 範圍與來源

單一合約、僅 127.0.0.1 的真實 HTTP 服務，使用現有 SSG SPA 作同源控制頁。沒有公開部署、託管服務或 request schema/auth 驗證。輸入子集與已知限制見根目錄 README。`tests/fixtures/mock-runtime/contract.json` 為本專案自行撰寫、明示 synthetic 的資料，不冒充真實 API 或市場需求證據。

## 原生工具比較與選型

2026-10-23 先安裝並實測 pinned Prism 5.16.0 公開 `createInstance` API：`prism-baseline.json` 記錄實際執行輸出，200／500 固定 example、`/pets/{id}` 匹配及 `/missing` 拒絕均通過。這個 JSON 是引擎 API 比較，不是 HTTP 封包擷取。整合 prototype 亦曾通過 HTTP／跨程序測試，但最後交付已換成以下實作，不以 prototype 結果替代最終驗收。

Prism 原生已能完成狀態碼與範例選擇，沒有證據表示需要自建完整 mock 引擎。此次增量在於每個 operation 的保存情境、固定 seed fixture、重啟相容檢查，以及同一工具站的控制流程；這不構成搜尋量或商業優勢的證明。

`prism-audit.txt` 保留安裝當時的 production audit：Prism → http-spec → postman-collection 帶入 lodash／Faker 兩項 high。最新 Postman 5.3.1 當時仍依賴 Faker 5.5.3；未跨主要版本硬改依賴或忽略 advisory。最終移除 Prism 相依，採用 **find-my-way 9.10.0 原生路由**與 **STW-14 fixture 產生／驗證器**。沒有自行重造 OpenAPI resolver、完整 schema engine 或路由匹配器。

來源：

- [Prism mocking guide](https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md)
- [find-my-way 官方 API](https://github.com/delvedor/find-my-way)
- [lodash advisory](https://github.com/advisories/GHSA-r5fr-rjxr-66jc)
- [Faker advisory](https://github.com/advisories/GHSA-qxc2-j82w-r537)

## 可重現驗證

先 `mise exec -- pnpm build`，再執行：

```sh
mise exec -- pnpm exec vp test run tests/mock-runtime.test.ts
mise exec -- pnpm exec playwright test tests/e2e/mock-api.spec.ts
mise exec -- pnpm verify
```

核心／真實 HTTP 測試涵蓋固定與 seeded fixture、無效 schema／example／引用、未支援 status／無 body 回應、路徑參數、未知路由、固定範例與 503 切換、實測延遲、無效／過期設定不覆寫、保存 rename 失敗保持舊狀態、0600 權限、跨程序重啟後回應一致、停止後無法再連線、單一 state writer、Host／Origin／明示 control header 拒絕。合約 servers 指向實際 loopback canary，HTTP 請求後 canary 收件數為 0；請求認證內容不出現在 stdout／stderr。

瀏覽器測試使用真正啟動的 CLI HTTP 服務，不攔截或假造 fetch：操作情境與延遲後，以獨立 HTTP client 驗證 503；重啟後恢復設定；範例 HTML 只顯示文字；手機 320 px 無水平溢出；SPA History 切換維持同一 document 並清除本次介面資料；清除頁面不刪除保存設定。正式靜態頁初始載入不探測本機服務。

本機控制頁只開放 same-origin connect-src。所有本機回應 no-store／noindex，Host 必須等於實際監聽的 127.0.0.1:port，Origin 若存在必須吻合；POST 同時要求 JSON 與自訂 control header。這些界線不是多租戶或網際網路服務的驗收。

## 驗收狀態

2026-10-23 完整 `mise exec -- pnpm verify` exit 0：959 個單元／整合測試、147 個瀏覽器測試通過；格式、lint、型別、workspace／21 頁 SSG 建置與 production audit 通過，0/13 task cache 命中。驗收紀錄 `/tmp/stw24-final-acceptance.log`。本卡結案時尚未 push／部署；使用者已另行授權結案後推送並驗證正式部署。
