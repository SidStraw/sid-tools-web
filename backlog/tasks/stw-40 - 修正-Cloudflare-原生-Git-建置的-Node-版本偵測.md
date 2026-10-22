---
id: STW-40
title: 修正 Cloudflare 原生 Git 建置的 Node 版本偵測
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-22 20:55'
labels: []
dependencies: []
references:
  - 'https://developers.cloudflare.com/pages/configuration/build-image/'
priority: high
type: bug
ordinal: 3137
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
推送已驗收的 139928d 後，Cloudflare Pages 原生 Git 建置 cfb63bb7 使用預設 Node 22.16.0，與 package.json 的 24.21.0 不符，在 pnpm install 以 ERR_PNPM_UNSUPPORTED_ENGINE 失敗。需恢復使用者要求的原生 Git 部署並驗證正式站。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cloudflare 原生建置選用與 mise／package.json 相同的 Node 24.21.0，安裝與建置成功。
- [ ] #2 tools.sid.tw 提供新工具頁、正確 canonical 與 sitemap，GitHub Pages 維持關閉。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 Cloudflare 原生支援的 repo .node-version 並對齊既有版本。2. 本機核對版本一致及既有驗收結果。3. commit/push 觸發原生 Git 建置，讀取部署狀態／logs 與正式站 HTTP／無頭瀏覽器結果。4. 確認 GitHub Pages 關閉，結案並保存遠端證據。
<!-- SECTION:PLAN:END -->
