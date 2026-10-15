---
id: STW-38
title: 遷移 Cloudflare：tools.sid.tw、原生部署整合與基本流量分析
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-15 10:29'
updated_date: '2026-10-15 10:50'
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
- [ ] #1 使用 repo 內官方 Cloudflare 工具與版本鎖定設定，tools.sid.tw HTTPS 正常服務四個 SSG + SPA 工具。
- [ ] #2 GitHub Actions 僅保留驗證，不再部署 Pages；GitHub Pages 設定停用且舊網址不再服務本站內容。
- [ ] #3 正式頁面 canonical 與 sitemap 指向 tools.sid.tw，預覽網址避免被當成另一個正式站收錄。
- [ ] #4 基本頁面分析已啟用並驗證 SPA 切換送出預期統計；明示可查看的指標及限制，工具輸入與檔案不送出。
- [ ] #5 原生 repo 部署整合與操作方式已記錄，四工具、根路徑、深層重整、載入及下載經本機與正式網域驗證。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用 repo 內官方 Wrangler 與 Cloudflare Pages 原生 Git OAuth 整合（純靜態 SSG + SPA），不建立 Workers Builds 的廣權限使用者 Token。2. 保留正式 tools.sid.tw、canonical/sitemap，改驗證 Pages 本機 runtime 與 pages.dev 重新導向/預覽 noindex。3. 透過現有 GitHub OAuth 連接 main，完成原生建置/部署並將網域從暫時 Worker 路由移轉至 Pages；保留既有 Web Analytics 排除歐盟偏好。4. 驗證四工具與真實 RUM、舊 GitHub Pages 404，完成 CI/公開站證據及卡片。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
repo 內 Wrangler 4.149.0 已安裝；最新版不符三天發布等待期，未放寬政策。現有 OAuth 已確認 sid.tw active 且 Worker 名稱無衝突；Cloudflare 儀表板已有 sid.tw 自動 Web Analytics，排除歐盟偏好保留。本機 wrangler runtime：27 unit/package、19 E2E 全 PASS，含 canonical/sitemap/404/SSG/SPA；dry-run 驗證 26 份資產。等待正式發佈與原生 Git 整合、分析 beacon 及 Pages 停用驗收。

使用者指出既有 repo 整合只需 GitHub/Cloudflare OAuth。確認 Workers Builds 的新部署 Token 是 Workers 路線需求，純靜態站改用 Pages 原生 Git 整合更符合使用者預期；未建立任何新 Token。已上線 Worker 可暫時維持服務，待 Pages 成功再移轉網域。
<!-- SECTION:NOTES:END -->
