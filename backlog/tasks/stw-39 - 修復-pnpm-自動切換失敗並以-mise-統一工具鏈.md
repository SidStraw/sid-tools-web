---
id: STW-39
title: 修復 pnpm 自動切換失敗並以 mise 統一工具鏈
status: Done
assignee:
  - '@codex'
created_date: '2026-10-15 12:57'
updated_date: '2026-10-15 13:30'
labels:
  - local-verified
  - remote-validation-pending
dependencies: []
documentation:
  - README.md
priority: high
type: bug
ordinal: 2137
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
終端機使用 mise pnpm 10.33.2，自動切換至專案 pnpm 12.8.2 的無 shebang launcher 時發生 ENOEXEC；mise 選中的 Node 24.21.0 尚未安裝。保留要求版本，停止 pnpm 自動管理 Node 與套件管理器。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 mise 提供 Node 24.21.0 與 pnpm 12.8.2，專案命令不再觸發失敗的自動切換
- [x] #2 pnpm 10 與 12 版本不符時明確報錯；移除 devEngines.runtime 與 lockfile runtime 管理
- [x] #3 開發文件、Agent 指引與兩份 CI workflow 使用一致版本且不依賴舊 PATH 注入
- [x] #4 frozen-lockfile 安裝與 pnpm verify 完整驗證通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 設定 mise 與 pnpm 版本檢查，遷移 Node 版本宣告。 2. 對齊 CI 與文件並更新 lockfile。 3. 安裝指定工具，驗證版本拒絕行為、frozen 安裝與完整 verify，記錄結果。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已建立專案 mise.toml，安裝並選用 Node 24.21.0 / pnpm 12.8.2，未修改全域預設。新增 pnpm 10 的 .npmrc 相容設定、pnpm 12 的 pmOnFail/runtimeOnFail 與 engineStrict；engines.node 取代 devEngines.runtime。pnpm 重新產生 lockfile 僅刪除 137 行 Node runtime，應用相依版本未變。README、AGENTS 與兩份 workflow 同步；現有 pinned pnpm/setup v3 支援 runtime: node@24.21.0，無需新增 action。驗證：mise 與 pnpm exec（含 workspace）均使用 mise Node；pnpm 10.33.2 直接拒絕專案版本，pnpm 12.8.2 在隔離 fixture 拒絕 12.8.1 要求，Node 24.15.0 在 engineStrict fixture 被拒絕。最終 frozen-lockfile 安裝 PASS；pnpm verify PASS，0/6 task cache hits，27 個單元測試與 19 個瀏覽器測試通過，格式/lint/typecheck/build 通過，production audit 無已知弱點。初次沙箱安裝受 registry DNS 限制，取得執行權限後成功；沒有關閉供應鏈檢查。GitHub Linux/macOS CI 尚未遠端執行，未 push 或部署。

2026-10-15 看板同步：本機 commit 4d2f6ec 已完成工具鏈與本機驗收；origin/main 仍為 931860f，該 commit 尚未 push。Done 僅表示本卡四項本機/設定 AC 完成，不表示新版 mise 設定已經 GitHub Linux/macOS CI 或 Cloudflare 原生 Git 建置驗證。新增 local-verified / remote-validation-pending 標籤，保留既有驗收限制。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
修復 pnpm 自動切換 ENOEXEC，改由專案 mise 設定提供指定 Node/pnpm，版本不符直接報錯；文件與 CI 同步。frozen 安裝及完整無快取 verify 通過（27 unit、19 E2E）。 本機 commit 4d2f6ec；尚未 push，GitHub Linux/macOS CI 與 Cloudflare 建置驗證未執行。
<!-- SECTION:FINAL_SUMMARY:END -->
