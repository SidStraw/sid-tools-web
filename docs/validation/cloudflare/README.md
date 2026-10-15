# tools.sid.tw Cloudflare 遷移驗收

日期：2026-10-15，任務 STW-38。使用者授權部署 tools.sid.tw、repo 內安裝整合工具、停用 GitHub Pages；不自寫部署 CI。

## 本機：PASS

repo 內 Wrangler 4.149.0、workerd 2026-10-06，未全局安裝。4.151.0 尚未符合 minimumReleaseAge，因此採用較早穩定版，未放寬等待期。僅允許官方 workerd 初始化，保留其餘相依供應鏈限制。

`pnpm verify` 無任務快取：27 個單元／套件測試、19 個 production E2E，格式／lint／型別與 production audit 通過。瀏覽器驗收現在使用官方 `wrangler dev --local`、網域根路徑，實際驗證 Cloudflare 靜態路由、canonical、sitemap、斜線重新導向與 404。原有四工具、載入競態／錯誤恢復、手機、下載、取消及不上傳測試保留。

`pnpm exec wrangler deploy --dry-run`：26 份靜態資產，設定驗證通過。

## 遠端：待完成

待記錄正式部署 ID、Git 整合、DNS／HTTPS、Web Analytics 真實 beacon、四工具公開驗收、Pages 停用與 CI 結果。

## 分析設定與限制

Cloudflare 儀表板確認 sid.tw 已有自動安裝 Web Analytics，選取「啟用，但排除歐盟的訪客資料」。沿用此偏好，不新增重複站點或 beacon。Wrangler OAuth 可部署 Workers，但缺少 RUM 管理權限；以已登入 Cloudflare 儀表板唯讀確認既有設定，沒有新增 API 憑證。

頁面分析應觀測真實瀏覽器送出的 RUM 請求後才能標記 PASS。統計可被廣告阻擋器或網路狀態影響；不等同工具使用成功率、UTM 歸因或 SEO 關鍵字曝光。工具輸入與檔案不得出現在 beacon payload。

## 官方來源

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/web-analytics/faq/
