---
id: STW-41
title: 修正 Markdown 壓力測試的機器速度依賴
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-22 21:02'
updated_date: '2026-10-22 21:11'
labels: []
dependencies: []
priority: high
type: bug
ordinal: 4137
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
macOS CI 39853084093 在 12.5 秒的 Markdown 樣本觀測因固定 10 秒斷言失敗；真正 30 秒 child timeout 隔離測試已通過。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 保留惡意樣本、解析語義檢查及獨立子程序隔離測試，移除不屬於產品契約的每樣本速度斷言。
- [ ] #2 完整本機驗證及 Linux／macOS CI 通過。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
檢查失敗 log 與既有隔離測試；將效能觀測保留為紀錄，功能斷言仍執行；完整驗證後推送並核對雙平台 CI。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已移除兩個僅供效能觀測的 10 秒同步解析斷言；保留 hostile fixtures、60 秒測試總期限及 30 秒獨立 child 逾時隔離。增加 fanout link count／limit anchorCoverage 語義驗證。目標 86 tests 通過，完整本機與雙平台 CI 待最後確認。

完整本機 pnpm verify exit 0：963 單元整合、148 E2E；格式／lint／型別／build／audit PASS。原始 CI Linux 已成功；修正後 Linux／macOS 新 CI 須在 push 後驗證，AC2 暫不勾選。
<!-- SECTION:NOTES:END -->
