---
id: STW-38
title: 遷移 Cloudflare：tools.sid.tw、原生部署整合與基本流量分析
status: Done
assignee:
  - '@codex'
created_date: '2026-10-15 10:29'
updated_date: '2026-10-15 11:09'
labels: []
dependencies: []
priority: high
type: chore
ordinal: 1137
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者指定以 tools.sid.tw 作為唯一正式入口，部署整合工具須安裝於 repo，不自行撰寫部署 CI；停用 GitHub Pages 以避免重複站點。需明確區分 edge 請求統計與實際頁面流量報告，保留工具資料僅在瀏覽器處理的界線。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 使用 repo 內官方 Cloudflare 工具與版本鎖定設定，tools.sid.tw HTTPS 正常服務四個 SSG + SPA 工具。
- [x] #2 GitHub Actions 僅保留驗證，不再部署 Pages；GitHub Pages 設定停用且舊網址不再服務本站內容。
- [x] #3 正式頁面 canonical 與 sitemap 指向 tools.sid.tw，預覽網址避免被當成另一個正式站收錄。
- [x] #4 基本頁面分析已啟用並驗證 SPA 切換送出預期統計；明示可查看的指標及限制，工具輸入與檔案不送出。
- [x] #5 原生 repo 部署整合與操作方式已記錄，四工具、根路徑、深層重整、載入及下載經本機與正式網域驗證。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用 repo 內官方 Wrangler 與 Cloudflare Pages 原生 Git OAuth 整合（純靜態 SSG + SPA），不建立 Workers Builds 的廣權限使用者 Token。2. 保留正式 tools.sid.tw、canonical/sitemap，改驗證 Pages 本機 runtime 與 pages.dev 重新導向/預覽 noindex。3. 透過現有 GitHub OAuth 連接 main，完成原生建置/部署並將網域從暫時 Worker 路由移轉至 Pages；保留既有 Web Analytics 排除歐盟偏好。4. 驗證四工具與真實 RUM、舊 GitHub Pages 404，完成 CI/公開站證據及卡片。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
repo 內 Wrangler 4.149.0 已安裝；最新版不符三天發布等待期，未放寬政策。現有 OAuth 已確認 sid.tw active 且 Worker 名稱無衝突；Cloudflare 儀表板已有 sid.tw 自動 Web Analytics，排除歐盟偏好保留。本機 wrangler runtime：27 unit/package、19 E2E 全 PASS，含 canonical/sitemap/404/SSG/SPA；dry-run 驗證 26 份資產。等待正式發佈與原生 Git 整合、分析 beacon 及 Pages 停用驗收。

使用者指出既有 repo 整合只需 GitHub/Cloudflare OAuth。確認 Workers Builds 的新部署 Token 是 Workers 路線需求，純靜態站改用 Pages 原生 Git 整合更符合使用者預期；未建立任何新 Token。已上線 Worker 可暫時維持服務，待 Pages 成功再移轉網域。

完成 Pages 原生 Git OAuth 整合，未建立新 API Token；main 自動部署啟用，afbab67 首次 Git 建置與部署成功，tools.sid.tw domain/verification/validation active、SSL 啟用，臨時 Worker 只解除該網域綁定。原生 Bulk Redirect 已實測 pages.dev 301 保留深層路徑/查詢，hash 預覽 noindex；舊 GitHub Pages HTTP404。Pages runtime pnpm verify：27 unit/package +19 E2E PASS，GitHub Verify 38723715383 Linux/macOS PASS。2026-10-15T11:04:59Z 正式站四工具真實樣本/下載/SPA/深層重整/手機與 RUM204 PASS，測試輸入不在 POST，無 CSP/page error。Web Analytics 沿用排除歐盟偏好，報表已篩選 tools.sid.tw；自然流量尚待累積。詳見 docs/validation/cloudflare/README.md 與 public-smoke.json。

追加遠端實證：push 204925d 後原生 deployment_trigger.type=github:push，898cc659-0c7a-4cb4-a0ef-8613d26989c1 於 2026-10-15T11:08:24Z build/deploy success。11:08:34Z host=tools.sid.tw 儀表板已入庫 3 visits /4 page views，包含 1 次軟式導覽；僅作分析入庫證據，含驗收活動，不宣告自然流量。截圖 web-analytics-report.png 已排除帳號資訊。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
tools.sid.tw 已遷移至 Cloudflare Pages，使用 repo-local Wrangler 與既有 GitHub OAuth 原生自動部署，未另建部署 Token 或 CI。停用 GitHub Pages，完成 canonical/sitemap、pages.dev 301 與預覽 noindex；四工具本機與正式站驗收、RUM204 及資料不上傳驗證通過。
<!-- SECTION:FINAL_SUMMARY:END -->
