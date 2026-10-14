# 產品方向與題目管理

## 已確認方向

2026-10-04，使用者確認：此專案計劃採 monorepo，不侷限於 Web；只要有發展空間就先納入題目池，開發順序以 Web 優先。

這份方向取代第一輪「只挑純瀏覽器工具」的篩選假設。保留題目與排入近期開發是兩個不同決策，維護成本、外部服務或本機權限需求應寫進卡片，不直接當成低價值的證據。

## 題目納入原則

- 先判斷具體問題、使用者成果與發展空間，再選 Web、CLI、IDE 或服務形式。
- 已有成熟工具時，評估整合、工作流程與可理解性的額外價值；不因有競品就排除，也不只換介面就宣稱差異。
- 技術或市場證據薄弱的題目仍可保留在 `Needs Refinement`。只有研究目標明確、尚無法承諾功能結果的題目使用 `spike`。
- 偏題、相同意圖的重複詞、單純導航詞及錯誤的安全承諾仍不另開卡。
- 同一能力的 Web／CLI／CI 延伸記在同張卡。具有不同使用成果、runtime 或營運責任的題目才另開卡，例如 fixture 產生與可呼叫的 Mock API 服務。

## 交付形式標籤

每張卡有一個主要 `delivery-*` 標籤，表示目前建議的首版形式，可在細化時調整。

| 標籤 | 意義 |
|---|---|
| `delivery-web` | 瀏覽器內處理或互動模擬 |
| `delivery-web-integration` | Web 為主要介面，可能需要平台 API 與授權 |
| `delivery-web-ai` | Web 操作，可能需要 AI 與隔離執行環境 |
| `delivery-local-cli-web` | 本機 CLI 讀取 repo／build，Web 顯示結果 |
| `delivery-cli-ci` | CLI／CI 為主要使用方式，可延伸 Web 報告 |
| `delivery-ide` | 依賴編輯器與真實專案上下文 |
| `delivery-web-service` | Web 管理介面加上接收、排程或長期執行的服務 |

`web-first` 表示優先驗證 Web 交付；`later-delivery` 表示先保留其他形式。`extension-cli`、`extension-ci`、`extension-ide`、`extension-service` 只記錄延伸可能，不代表該介面已完成或必須在首版同時實作。

## 優先順序

- **High**：原先保留的 6 個 Web 情境，優先驗證價值與首版範圍。
- **Medium**：其餘 Web 優先候選，包含新增的整合、模擬與素材工具。
- **Low**：後續交付或探索成本較高的候選。這表示排程較後，不表示產品價值低；有新證據即可調整。

目前卡片均為 `Needs Refinement`，沒有因本次擴大題目池而開始實作。SEO 數字與 pipeline 詞頻仍不等於搜尋量、獨立需求或收入。

## Monorepo 邊界

monorepo 是已確認的組織方向。目前尚未選定 workspace 目錄、共用套件邊界、框架、建置工具或部署方式。

共用解析、轉換及診斷能力可在多個交付形式出現真實需求後抽取；不同工具也可有獨立 runtime。不得只因 monorepo 就預先建立所有 apps／packages、強制共享實作或將題目池視為全量實作承諾。

## 可追溯資料

- [目前篩選總覽](../research/keyword-review-2026-10-04/README.md)
- [第一輪 Web 篩選快照](../research/keyword-review-2026-10-04/initial-web-review.md)
- [逐詞決策](../research/keyword-review-2026-10-04/keyword-decisions.json)

