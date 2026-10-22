# STW-19 Bundle 比較驗證

本卡以 repo-local Vite+/Rolldown plugin 收集真實產物，CLI 比較及同一 SPA 的 lazy route 呈現。未推送或部署；搜尋需求、競爭差異及流量收益尚未驗證。

## 驗收對應

| AC  | 實作與證據                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 收集實際寫入檔案的 raw/gzip/Brotli、SHA256、入口與環境。`tests/bundle-report.test.ts` 用原生 Vite 建置後獨立讀檔與壓縮核對；`repository-build.json` 是目前 repo 實際建置快照。                                                                               |
| 2   | chunk identity、imports、dynamic imports、module/package 及長度差異。受控 fixture 真的改變 main.js 並重新建置，驗證 hash 檔名仍可追查；fixture 的 sample-package 是測試套件，不當作市場證據。重複 identity 與未知長度不補造，無 module 的 asset 保留未歸因。 |
| 3   | 同一 fixture 的原生 target/minify 設定改變後重建，確認不相容與 CLI exit 3；metadata 缺失、預算 not-evaluated 另有單元及瀏覽器測試。                                                                                                                          |
| 4   | CLI 唯讀兩份報告，驗證 exit 0/1/2/3、預算邊界；瀏覽器檢查搜尋、來源、下載、輸入變更、錯誤及清除、SPA 往返、320px 與輸入未發網路／寫 storage。沒有改寫 import 或套件功能。                                                                                    |

## 重現

```sh
mise exec -- pnpm build
mise exec -- pnpm exec vp test run tests/bundle-report.test.ts
mise exec -- pnpm exec playwright test tests/e2e/bundle-diff.spec.ts
mise exec -- pnpm verify
```

完整測試會以 temporary fixture 重新執行 Vite 建置，並在結束後清除。`tests/helpers/bundle-build.ts` 保存樣本來源、設定與受控修改；無需私有專案。

專案快照生成命令（請使用新路徑，既有檔案不覆寫）：

```sh
STW_BUNDLE_REPORT=/tmp/repository-build.json mise exec -- pnpm exec vp run --no-cache @sid-tools/web#build
```

快照對應收集時的工作目錄，並非線上部署體積；後續文件或程式修改不會更新舊快照。每份報告列出 configHash 與每個產物 SHA256。量測排除 public 複製檔，總和不是首屏下載量；module renderedLength 不等於最終 bytes。沒有證據的壓縮歸因保留未知。收集器需要執行受信任的原生 build；比較器與 Web 只讀報告。

## 實際專案快照

`repository-build.json` 記錄 Node 24.21.0、Vite 8.3.1、Rolldown 1.2.11，含 70 個產物與 18 個 HTML 入口。入口來自原生 build input，不只依賴 JS chunk 的 isEntry；430 筆 module 記錄保留原始歸屬。多頁共用 JS 的情況也不會被錯報成零入口。

## 驗證結果（2026-10-23）

- `mise exec -- pnpm verify`：PASS，無 task cache。27 個測試檔、947 個單元／整合測試及 140 個瀏覽器測試通過；format、lint、strict type check 無警告或錯誤，production dependency audit 無已知漏洞。
- STW-19 專屬 3 個原生 build／CLI 整合測試與 1 個實際 headless Chromium 流程通過。報告不覆寫既有檔案、不寫進部署 outDir；資料清除也移除隱藏結果內容。
- 已檢視 320px 實際截圖，無橫向溢出；既有選單、18 個深層頁面的 SSG／reload／canonical／sitemap 回歸通過。
- 驗證為本機結果；未執行遠端 CI、push 或部署。
