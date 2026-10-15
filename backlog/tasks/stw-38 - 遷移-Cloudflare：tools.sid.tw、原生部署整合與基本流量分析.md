---
id: STW-38
title: 遷移 Cloudflare：tools.sid.tw、原生部署整合與基本流量分析
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-15 10:29'
updated_date: '2026-10-15 10:37'
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
1. 查證官方 Wrangler / Workers Static Assets、原生 Git 整合、網域與 Web Analytics。2. 安裝專案內 Wrangler 並驗證帳號，配置靜態資產與 tools.sid.tw，移除 Pages 發佈流程並加入 canonical / sitemap。3. 保留本機無分析驗收，啟用正式站 Web Analytics 並驗證 SPA 與資料界線。4. 完成 pnpm verify、階段 commit，部署及設定原生 Git 整合；新站驗收後停用 Pages，補記公開證據與完成卡片。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
repo 內 Wrangler 4.149.0 已安裝；最新版不符三天發布等待期，未放寬政策。現有 OAuth 已確認 sid.tw active 且 Worker 名稱無衝突；Cloudflare 儀表板已有 sid.tw 自動 Web Analytics，排除歐盟偏好保留。本機 wrangler runtime：27 unit/package、19 E2E 全 PASS，含 canonical/sitemap/404/SSG/SPA；dry-run 驗證 26 份資產。等待正式發佈與原生 Git 整合、分析 beacon 及 Pages 停用驗收。
<!-- SECTION:NOTES:END -->
