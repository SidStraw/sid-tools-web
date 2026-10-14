---
id: STW-2
title: YAML 轉 .env：預覽扁平化規則與鍵名衝突
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - configuration
  - delivery-web
  - web-first
  - extension-cli
  - demand-reviewed-2026-10-14
  - excluded-standalone
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/08_032927.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/28_055526.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/21_035139.md
  - 'https://github.com/shirocola/yaml-to-env-converter'
  - 'https://jsonkit.com/yaml-to-env'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 902
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

把巢狀設定改為環境變數時，手動轉換容易遺失型別、引號或覆寫同名鍵，單純文字替換無法可靠完成。

## 首版邊界

本機輸入 YAML，預覽原始路徑到環境變數鍵名的對照後匯出 .env；不宣稱能把 Conda environment.yml 直接變成部署設定。

## 差異與待驗證假設

先呈現命名衝突和有損轉換，讓使用者能檢查再匯出，而不是只給轉換結果。

## 關鍵字證據與合併

- `yaml to environment variables converter`：17 份報告出現。
- `yaml to env converter`：8 份報告出現。
- `yaml to env online`：8 份報告出現。

本卡合併 8 個唯一關鍵字，來自 17 份報告、64 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: yaml-env）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/21_035139.md 至 logs/2026_09/08_032927.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 批次設定轉換。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 支援巢狀 mapping、字串、數字、布林與陣列的明確輸出規則，預覽每個來源路徑及鍵名。
- [ ] #2 a.b 與 a_b 等扁平化衝突阻擋匯出，不能默默覆寫。
- [ ] #3 空字串、null、換行、引號與特殊字元有可驗證的編碼規則；不支援的 YAML tag 或循環 alias 明確拒絕。
- [ ] #4 匯出結果可用選定的 dotenv 語法重新解析；變數內容不當作 shell 指令執行。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / archive。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除獨立開發排程；可能併入 STW-1 的設定前處理，但不擴充其 AC。不是判定無需求，也不是泛稱 AI 全面替代。 核心搜尋找到多個直接轉換產品及開源 repo；沒有取得獨立使用者頻率或搜尋量。

提升／重新納入條件：至少 3 個真實部署轉換案例，證明免費基準發生可重現資料遺失／碰撞且願重複使用；再補對應 query 需求證據。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
