---
id: STW-36
title: Markdown 文件的相對連結與 anchor 批次檢查
status: Done
assignee:
  - '@opencode'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-16 02:15'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/12_045343.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/08_034536.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/25_041218.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/13_040708.md
  - 'https://lychee.cli.rs/recipes/anchors/'
  - 'https://lychee.cli.rs/guides/cli/'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 136
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

monorepo 文件改名或搬移後，相對路徑與 heading anchor 容易失效，需要 repo 上下文及 renderer 規則。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先本機檢查 Markdown 檔案、相對路徑、圖片與 anchor，外部連結檢查作為可選步驟。

## 延伸方向與相鄰題目

可延伸 CI baseline、IDE 提示與 Web 報告；STW-17 檢查 sitemap XML，不負責 repo 文件連結。

## 關鍵字來源與合併

代表原始詞：`markdown link validator`; `markdown link check pre commit`; `markdown linter online`。

本題合併 12 個相關唯一詞，來自 4 份報告、15 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: markdown-links）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 每個錯誤可定位來源檔案及目標，區分不存在檔案、缺少 anchor 與無法判斷。
- [x] #2 明示 heading anchor 產生規則，code block 內的範例不當成真實連結。
- [x] #3 支援忽略規則與增量結果，外部請求需可停用並限制頻率。
- [x] #4 不自動重寫文件；修正若提供，先顯示差異與回復方式。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用已查證固定版本 unified/remark-parse/remark-gfm 與 github-slugger，新增純 Markdown AST／heading anchor／URL 分類核心 public entry；明示 GFM-heading 子集，不手刻 Markdown，不將 code block 範例當連結。
2. 新增 apps/markdown-links Node CLI 與 vp build/verify 整合；root-contained 有界檔案掃描，不跟隨 symlink、不讀 root 外檔案，區分 missing-file、missing-anchor、unknown，顯示來源範圍與目標。
3. 支援明示 ignore 規則及 baseline 增量結果；每次完整重查目前文件與 target，不以 source-only cache 留存過期 anchor 結果。外部連結一律 external-skipped／離線，零請求；首版不提供文件重寫或 fix。
4. 平行核心與 CLI adapter，使用固定 API 合約；核心先完成 dependency install，CLI 整合 build/測試等待核心凍結，避免 package manager 寫入衝突。
5. 固定 AST／slug／URL encoding／unknown／資源限制測試與實際 CLI tempfixture 測試，驗證 ignore、symlink 邊界、target anchor 修改反映 inbound link、baseline policy mismatch、零網路／零改寫。凍結後完整 pnpm verify、獨立 Oracle 安全審查與結構掃描，四 AC 通過才 Done 與獨立 commit。

6. 已完成審查補強：整體掃描隔離於獨立 child process（非 worker_threads），明示 128-MiB V8 old-generation／4-MiB stack／30 秒期限、空環境、原生輸出抑制、身分與形狀檢查 IPC、close/reap 後回報；fatal no-model 解析失敗全域 failed-coverage/null delta，保留 ignored directory metadata 與 directoryRequired 路徑語義。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Lychee 已支援 Markdown 相對檔案與 fragment 檢查；目前文件亦明示 renderer-specific 限制。以原卡 CLI/CI 整合範圍保留，非流量主力。

提升／重新納入條件：取得指定 renderer 的現行可重現漏判，以及願意改用工具的使用者。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

2026-10-16：依使用者實作所有未完成卡片授權啟動，舊市場 defer 不再作為跳過理由。首版只做本機檢查，外部請求完全停用（因此無請求速率）；增量指 baseline 結果差異，仍完整重查所有連結以避免 target 變更漏判。不宣稱全部 GitHub renderer 語法相容，不自動重寫文件。

2026-10-16 最終驗收：四項 AC 均有實際 built-bin/public/core 證據；123 focused tests（86 core、14 public、18 CLI、5 scanner/protocol）通過。父工作階段更新後的 mise exec -- pnpm verify（sh_14279ec32001VKRZrY51I3Xpro）PASS：937 unit/public、138 production E2E、218 formatted、113 strict clean、core/CLI/web build＋audit、cache 0/7；既有 TS7 experimental API notice 保留。使用者要求的新獨立 Oracle attempt2（ses_ebd93c0e0ffeZ2oLtfqNhaSIFX）PASS，四項 material findings 全數解決、無新增 material issue；既有 broad structure PASS＋父階段 bounded child structure PASS（非新的 explorer verdict）。精確 24015-unit blockquote 實際 CLI 已 sanitized child-failed/exit2、stderr=0、parent survives；fatal parser baseline null delta、pruned ignored directory、regular-file directory syntax 含 encoded dots 均有 regression。HTTP canary=0，read-only tree SHA-256 前後相同；無 fix／網路模式。無 DOD items。已記錄可信靜態 checkout、hardlink／非原子觀察、GFM 子集、V8 非 OS sandbox、paths/URLs metadata 隱私限制於 docs/validation/stw-36。僅本卡本機 commit；push/deploy 仍由父階段另外負責，未操作其他卡。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成離線唯讀 Markdown links Node CLI 與 public AST/GFM-heading core，提供來源／目標／位置、missing-file／missing-anchor／unknown、明示 ignore 與完整重查 baseline delta。獨立 child process 隔離解析資源失敗；四項安全／語義審查問題已修正。Focused 123 tests、更新後完整 verify 937 unit/public＋138 production E2E、strict/build/audit 與 Oracle attempt2／structure gates 全部 PASS；零外部請求、無自動改寫。保留已揭露 race/V8/privacy/renderer 限制。
<!-- SECTION:FINAL_SUMMARY:END -->
