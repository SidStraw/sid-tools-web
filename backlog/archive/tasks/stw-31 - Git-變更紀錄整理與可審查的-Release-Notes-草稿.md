---
id: STW-31
title: Git 變更紀錄整理與可審查的 Release Notes 草稿
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
  - demand-reviewed-2026-10-14
  - excluded-standalone
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/21_033414.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/30_044113.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_03/30_041811.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/28_035225.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
  - 'https://github.com/orhun/git-cliff'
  - >-
    https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 931
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

把 commit、版本範圍與破壞性變更整理成可讀 release 草稿，適合在 repo／CI 取得可信來源。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先接受指定 git 範圍並產生分組草稿，處理 merge／revert 與不符合規範的訊息；不自動發布 release。

## 延伸方向與相鄰題目

可延伸 monorepo package 分組、版本建議與 Web 審查；STW-10 看單份 diff，這張處理一段版本歷史。

## 關鍵字來源與合併

代表原始詞：`changelog generator conventional commit`; `generate changelog from commits`; `git commit message format validation`。

本題合併 42 個相關唯一詞，來自 24 份報告、77 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: release-notes）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 草稿每項可回連 commit，列明 base／head 和來源完整性。
- [ ] #2 feat／fix／breaking、revert 與不合格式的訊息採公開規則分類。
- [ ] #3 不能只依 commit 字詞推測已完成產品效果；不確定內容標為待審查。
- [ ] #4 可匯出草稿與需補寫清單，版本變更及遠端發布需另行明確操作。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / archive。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除獨立流量工具投資；本卡為確定性 CLI/CI 工作，不能用純 AI 摘要理由排除。 GitHub 原生與 git-cliff 已提供來源連結、分組／設定／草稿等流程；沒有本專案額外取得使用者證據。

提升／重新納入條件：至少 3 個真實 release 範圍能證明 git-cliff／原生流程造成可重現錯漏，且專用審查能省下顯著維護成本。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
