---
id: STW-34
title: 批次圖片最佳化：依目標大小與尺寸預算匯出
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web
  - web-first
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/17_042019.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/15_043727.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/23_042955.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/12_041935.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: medium
type: feature
ordinal: 22
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

上架素材常受檔案大小、尺寸與透明背景限制；以輸出預算為目標比單純換副檔名更有操作價值。

## 交付形式與首版邊界

主要形式：web。順序：Web 優先候選。

先在瀏覽器批次處理常見靜態圖片，提供前後預覽、每檔結果及 ZIP 下載。

## 延伸方向與相鄰題目

未來可提供 CLI 處理大量素材；保持同一產品候選，不依 Web／CLI 重複開卡。

## 關鍵字來源與合併

代表原始詞：`batch webp converter`; `bulk webp converter free`; `webp compression settings`。

本題合併 11 個相關唯一詞，來自 4 份報告、12 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: batch-images）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 使用者設定尺寸、格式及檔案大小預算，結果逐檔顯示是否符合。
- [ ] #2 透明度、方向與動畫的支援範圍明示，不能默默丟掉畫格或背景。
- [ ] #3 無法達到預算時保留結果和原因，不假報成功；可比較壓縮前後畫面。
- [ ] #4 批次有容量限制、取消與清除功能，原始圖片不自動上傳。
<!-- AC:END -->
