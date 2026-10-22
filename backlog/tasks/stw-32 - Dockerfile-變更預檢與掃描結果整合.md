---
id: STW-32
title: Dockerfile 變更預檢與掃描結果整合
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 21:11'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
  - demand-reviewed-2026-10-14
  - deferred-evidence
  - agent-can-proceed
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/19_040534.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/18_041554.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/11_035210.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/18_035246.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/16_033245.md
  - 'https://github.com/hadolint/hadolint'
documentation:
  - docs/validation/stw-32/README.md
priority: low
type: feature
ordinal: 132
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

Dockerfile 靜態問題、image 掃描與實際體積結果常散落在不同工具；可發展可追溯的變更審查流程。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先整合一種 linter 與可選的 image scan 結果，分開靜態建議、已掃描發現與尚未執行項目。

## 延伸方向與相鄰題目

可延伸 CI gate 和修正前後的真實 image 比較；不重造漏洞資料庫或宣稱改寫必定最佳化。

## 關鍵字來源與合併

代表原始詞：`dockerfile linter online`; `dockerfile optimization tool`; `dockerfile vulnerability scanner`。

本題合併 20 個相關唯一詞，來自 16 份報告、52 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: dockerfile-review）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 每項結果列出規則／掃描器版本、位置與判定依據。
- [x] #2 沒有 image 或 scan 證據時，不宣告無漏洞或體積已改善。
- [x] #3 靜態輸入不自動執行 Docker build；需要建置時先明示執行範圍。
- [x] #4 輸出可審查報告與建議，保留誤判註記及可重現樣本。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用 Hadolint 2.15.1 官方原生 binary；先下載至 repo .cache，核對官方 release SHA256 並實際執行公開固定來源 Dockerfile，保留版本、來源及原始 JSON 報告。不得全域安裝或執行 Docker build。
2. 提供 repo-local CLI 的明示安裝／scan／review 流程。安裝只下載白名單版本／平台並驗 hash；scan 固定原生設定，隔離使用者全域設定與環境覆寫，不執行 Dockerfile 指令，限時、限量且失敗不輸出成功報告。
3. 共用核心接收有版本、Dockerfile 摘要、原始行號與 rule/message 的報告；加入人工誤判理由與可審查匯出，來源變更時不可沿用舊註記。可比較前後 lint 結果，不把靜態建議當已實作改善。
4. 同一 SSG SPA 增加 Dockerfile 審查頁：載入報告、篩選嚴重度、定位來源、記錄誤判理由及匯出。沒有 image scan 時明示未執行；首版不執行 image build／掃描，不宣稱無漏洞或體積改善。
5. 驗證官方 binary 真實輸出、固定公開 Dockerfile、受控修正比較、損壞輸入、錯誤版本、誤判理由保存與失效、瀏覽器隱私／SPA 生命週期；執行完整 pnpm verify 後結案、commit，依最新授權 push／Cloudflare 原生部署並核對正式結果。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Hadolint 已有 CLI 與官方線上版本；整合掃描和可追溯修正不是 AI 文案，但無工具站新增價值證據。

提升／重新納入條件：用真實 Dockerfile 對照現成 lint/scan，證明錯誤優先排序或核對省時。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-23 介入需求盤點

可直接推進：代理自行選定一種既有 linter，準備真實可追溯 Dockerfile 與報告樣本，驗證規則版本、位置和誤判註記。image scan 可選，沒有掃描證據明示未執行；不把 Docker build 當作靜態檢查的隱含操作。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。

2026-10-23 實作與驗收：官方 Hadolint 2.15.1 固定平台 digest、專案 .cache 明示安裝、scan 每次重驗 hash／版本；固定設定與乾淨環境、stdin、15 秒／2 MB 原生限制，不執行 Dockerfile 指令。固定 nodejs/docker-node 84410ee 公開樣本真實回報 6 項規則，原始 JSON／MIT license／來源 SHA256 已保存。Web 為同一 SSG SPA 第 22 頁，獨立 worker 載入有界報告、篩選／來源／理由匯出與重新載入；來源改變使舊理由失效。4 個真實 native/core 測試、瀏覽器報告／隱私／SPA／320px 驗證通過；完整 pnpm verify exit 0：963 單元整合、148 E2E、格式／lint／型別／build／production audit PASS，0/15 task cache。Image build／scan NOT RUN，沒有體積／漏洞改善主張。使用者已授權結案後推送部署，將依此進行遠端驗收。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 Hadolint 官方引擎整合、可重現 Dockerfile 報告、本機 CLI 與 SPA 審查頁。完整本機驗收通過；依最新授權推送並透過 Cloudflare 原生整合部署。限制及真實樣本證據見 docs/validation/stw-32。
<!-- SECTION:FINAL_SUMMARY:END -->
