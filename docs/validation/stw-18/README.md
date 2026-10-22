# STW-18：pnpm 相依來源檢視

本機交付，未部署。使用 pnpm 9.0 lockfile 的 importer、package metadata 與 snapshot，支援本專案的 boot/env + project 雙文件格式。只分析最後一份 project graph；boot 工具鏈不混入應用程式依賴。

## 重現

```sh
mise exec -- pnpm build
mise exec -- node apps/dependency-graph/dist/cli.mjs . > /tmp/dependencies.json
mise exec -- pnpm verify
```

本機網站 `/tools/dependency-graph/` 載入報告；搜尋 `yaml@2.9.1` 後選取同名節點，展開 workspace 路徑查看每條邊來源。來源行號以匯出當時 lockfile 為準，manifest Pointer 的 `wN` 對應同次報告的 workspace ID。需要實際相對目錄時，明確使用 `--include-workspace-paths`。

## 驗收對照

| AC                               | 證據                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1：每條邊來源與 workspace 引入鏈 | core 測試固定 lockfile 行號與 manifest Pointer，包含 workspace link、npm alias 與循環；CLI 與瀏覽器測試使用本專案真實報告查 yaml 的多個 workspace 引入路徑。 |
| 2：版本與 peer context           | 同一版本兩組 peer context 與 leaf 的兩個版本分開驗證；頁面分別列出，沒有可刪除的結論。                                                                       |
| 3：不完整資料與 scripts          | 舊格式、重複 YAML key、alias、未知報告、缺 manifest、缺 snapshot、宣告過期都有拒絕或診斷；CLI symlink 逃逸測試，從不執行 scripts。                           |
| 4：本機匯出與 Web、路徑隱藏      | 真實 CLI stdout JSON 直接傳入瀏覽器；預設沒有 repo 絕對路徑或 workspace 目錄名，無輸入傳輸或 storage 寫入；清除、SPA 切換、歷史及重載丟棄輸入。              |

`repository-sample.json` 記錄本次 lockfile SHA-256、5 個 workspace、476 個 package context、850 條邊與 0 未解析邊；後續加入 workspace 時數量及 hash 會自然改變，不作為固定測試期待。

## 明確限制

- 僅支援 registry semver snapshot、npm alias 與 repo 內 workspace link；git/file/tarball 等未支援識別不輸出原始值，列未解析診斷。非 9.0 或不安全 importer 路徑拒絕。
- 含 dependency／devDependency／optionalDependency。optional 邊表示 lockfile 宣告，不證明安裝平台選擇或目前實際安裝；peer context 不等同重複安裝位元組。
- 每個 workspace 顯示一條最短引入路徑。循環不無限展開；每個節點另列所有直接邊。長路徑與直接依賴分批顯示，workspace 路徑按需展開。
- 預設隱藏 workspace 路徑，不是完整匿名化：套件名稱、版本、peer context 與關係仍保留。解析報告不含 integrity、resolution URL、scripts、source 或 env 值。
- 8 MB 輸入／瀏覽器報告、12,000 節點、60,000 邊、300 workspace；診斷有明示上限。瀏覽器 JSON 解析與驗證在 dedicated worker。
- 功能驗收不證明搜尋量或比 Nx 更受市場歡迎。此交付把 lockfile 的 peer identity、manifest 同步診斷與可分享的本機報告串接；未重新做市場比較。

## 格式來源

- [pnpm lockfile 9.0 spec](https://github.com/pnpm/spec/blob/master/lockfile/9.0.md)
- [pnpm 多文件 lockfile 說明](https://github.com/pnpm/pnpm.io/blob/main/docs/lockfile.md)

## 最終結果（2026-10-23）

- `mise exec -- pnpm verify`：PASS，無快取完整建置與格式／lint／型別檢查通過，944 項單元／整合測試、139 項瀏覽器測試通過；production audit 無已知漏洞。
- 新工具的瀏覽器測試實際讀取本機 CLI 輸出，驗證載入、精確套件選取、來源、版本／peer 區別、錯誤報告清除舊結果、無輸入網路傳輸／storage，以及 320px 與 SPA history／reload。
- 共用網站驗證涵蓋 17 個工具選單、停用 JavaScript 的 SSG、canonical、sitemap、深層路由與 404。另以隔離 headless Chromium 檢視桌面 1200px 與手機 390px 的實際頁面。
- 未 push、未部署；需求與流量驗證維持未完成。
