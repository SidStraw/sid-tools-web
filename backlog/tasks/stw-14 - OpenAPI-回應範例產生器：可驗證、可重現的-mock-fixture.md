---
id: STW-14
title: OpenAPI 回應範例產生器：可驗證、可重現的 mock fixture
status: Done
assignee:
  - '@opencode'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 20:17'
labels:
  - keyword-research
  - proposal
  - api
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - extension-service
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/03_042558.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/26_035558.md
  - 'https://github.com/Redocly/openapi-sampler'
  - >-
    https://mock-server.com/versions/7.6.0/apidocs/org/mockserver/openapi/examples/SampleDataGenerator.html
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 114
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

前端開發與測試需要符合 schema 的固定回應範例；架一個 mock server 常比取得一份可用 fixture 更費工。

## 首版邊界

首版限定 OpenAPI 3.0.x 選定 operation、status 與 JSON schema 子集，輸出本機 JSON fixture；不提供託管 API 或真正的網路模擬。

## 差異與待驗證假設

輸出對照 schema 的驗證結果與固定 seed；mock server 關鍵字僅提供鄰近意圖，不能當成離線 fixture 已有需求的證據。

## 關鍵字證據與合併

- `openapi mock data generator`：3 份報告出現。
- `openapi mock generator`：2 份報告出現。
- `api mock data generator`：4 份報告出現。

本卡合併 10 個唯一關鍵字，來自 24 份報告、31 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: mock-fixtures）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/26_035558.md 至 logs/2026_09/01_033208.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI fixture 產生；Mock API runtime 另有候選。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 選擇 operation 與 response status 後可產生 JSON fixture，優先使用有效 example 並說明資料來源。
- [x] #2 相同文件、選項與 seed 得到相同結果；必填、enum、array 與基本限制在支援範圍內被驗證。
- [x] #3 遇到循環 $ref、未支援 oneOf／格式或外部引用時明確提示，不聲稱產物一定符合完整規格。
- [x] #4 可下載 fixture 與驗證摘要，所有資料為 synthetic 且不代替真實 API 契約測試。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 重用既有內部有界 OpenAPI YAML/JSON parser，新增獨立 fixture 純核心；列出實際 operation/status/JSON media，不啟動 mock server，不解析遠端引用。
2. 對明示 OAS3.0.x 子集實作固定 seed 生成與分開的 instance 驗證；先驗證有效 media/schema example 並保留來源，不合格候選有診斷再 fallback。必填、enum、array、基本界限與 response readOnly/writeOnly 明確處理；unsupported/ref循環/無可行值不得稱有效。
3. 生成前要求使用者確認來源文件與 literals 僅含測試資料，區分沿用 example/enum 與本機生成，不能宣稱匿名化或實際 API 行為。相同文件、選項、seed 結果固定，不新增 sampler/AJV。
4. 整合專用可終止 module worker、文件與選擇器、固定 synthetic 範例、驗證／來源明細及明確下載 fixture/精簡摘要；清除／編輯／離開／逾時即終止，無上傳／保存／分享 URL。
5. 核心 deterministic/獨立驗證/unsupported/資源/隱私回歸與 production E2E/手機截圖；程式碼凍結後完整 pnpm verify、Oracle及結構審查，通過才勾 AC、Done 與獨立 commit。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Redocly sampler 與 seeded mock 產品已有樣本生成；卡片的受限且經驗證 fixture 尚有品質假說，但無可比較流量證據。

提升／重新納入條件：用原 AC 範圍的 schema 比較有效率與錯誤定位；fixture 與 STW-24 server 保持區分。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

2026-10-16：依使用者實作全部未完成卡片授權啟動，舊市場 defer 不再作為跳過理由。採 bounded generator + separate validator，無新增依賴；OAS3.0 example 優先序為本工具明示政策而非規格規定。來源 example/enum 可能是真實資料，生成前需明確確認僅測試資料並揭露沿用來源，不能自動聲稱 synthetic／匿名化。

2026-10-16：完成本機 OpenAPI3.0.x operation/status/JSON media 選擇、有效 example 優先、固定 seed 生成與分開的 instance 驗證，包含來源與拒絕候選診斷、可終止專用 worker、fixture／精簡摘要下載。來源確認僅含測試資料為使用者聲明，不代表自動匿名化；沿用 example/enum 明確揭露。完整 mise exec -- pnpm verify 無快取通過：616 單元／套件、114 production E2E、格式／strict／build／audit；既有 TypeScript7 experimental API 提示保留。獨立 Oracle1 與結構審查 PASS，八張目前合成截圖已檢視。證據 docs/validation/stw-14/README.md。接受靜態子集、有限數值／資源／attempt、unsupported 拒絕限制，不代替真實 API 契約測試；未 push 或部署。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已交付可重現 OpenAPI response fixture：固定 seed、有效 example 優先、獨立驗證、來源診斷與本機下載。616 單元／套件及114 E2E、完整 verify、獨立語意／安全及結構審查通過；五項 AC 有客觀證據，詳見 docs/validation/stw-14/README.md。
<!-- SECTION:FINAL_SUMMARY:END -->
