# 產品方向與題目管理

## 已確認方向

2026-10-14，使用者確認：產品目標為**多合一工具站獲取流量，不限制使用者族群，以可驗證的流量機會優先**。一般辦公、圖片與文件處理、資料整理、網站經營及開發工具均可納入比較；不能因既有題目池偏開發者而排除其他方向。盡量避免 AI 可直接完成且缺少額外操作價值的工具。

候選排序先查具體搜尋需求、結果頁是否需要使用者進入工具、現成工具與 AI 的替代程度，再評估完成任務的便利性及取得流量所需的開發／維護成本。族群廣泛、關鍵字多或功能難做，均不自動提高優先序。當需求資料缺失時保留未知，不補造流量分數。

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

| 標籤                       | 意義                                       |
| -------------------------- | ------------------------------------------ |
| `delivery-web`             | 瀏覽器內處理或互動模擬                     |
| `delivery-web-integration` | Web 為主要介面，可能需要平台 API 與授權    |
| `delivery-web-ai`          | Web 操作，可能需要 AI 與隔離執行環境       |
| `delivery-local-cli-web`   | 本機 CLI 讀取 repo／build，Web 顯示結果    |
| `delivery-cli-ci`          | CLI／CI 為主要使用方式，可延伸 Web 報告    |
| `delivery-ide`             | 依賴編輯器與真實專案上下文                 |
| `delivery-web-service`     | Web 管理介面加上接收、排程或長期執行的服務 |

`web-first` 表示優先驗證 Web 交付；`later-delivery` 表示先保留其他形式。`extension-cli`、`extension-ci`、`extension-ide`、`extension-service` 只記錄延伸可能，不代表該介面已完成或必須在首版同時實作。

## 優先順序

2026-10-14 已依需求與競爭查證透過 Backlog CLI 回寫，見 [最新決策](../research/tool-portfolio-review-2026-10-14/demand-review.md)。

- **High：0**。尚未取得足以支持高投入的差異與流量證據。
- **Medium：6**。依序 STW-34、16、3、5、28、27，先驗證原有範圍的增量價值。這是驗證順序，不是市場大小排名。
- **Low：25**。暫緩但保留特定差異／專業工作流與明確升級門檻；同組不細分市場強弱。
- **歸檔：6**。STW-2、4、9、26、29、31 退出獨立投資，保留研究歷史與原 AC，不標成 Done。
- **新增：0**。六個新方向有需求或供給線索，但尚無足夠未解增量證據。

前一輪研究結束時，31 張活躍卡皆為 `Needs Refinement`。2026-10-14 使用者授權直接完成首張 STW-34，該卡進入實作，最新狀態以 Backlog CLI 為準；其餘卡片不自動啟動。`validate-next` 表示下一輪差異驗證，`deferred-evidence` 表示需補證據，`excluded-standalone` 表示已排除現行獨立投資；`demand-reviewed-2026-10-14` 為本輪批次。原 delivery 標籤只描述交付候選，不凌駕需求優先序。

提升至 To Do 前，需要明確使用場景、現成工具／可執行檔案的 AI 對照、首版邊界與成本。不能以 pipeline 詞頻、競品存在或問題回報數代替市場規模。

同日補充 [STW-34／STW-16 無頭瀏覽器實測與搜尋量](../research/competitor-validation-2026-10-14/README.md)：圖片工具已找到逐檔限制／取捨回報缺口，Lighthouse 官方比較器已重現不同裝置／節流仍直接呈現分數增減的情境。第三方搜尋量僅支持部分圖片意圖，Lighthouse 精確比較意圖未取得正向量證據；仍維持 34 → 16 的驗證順序，不升 High、不轉 To Do。其他卡片的量化需求不因這次補查而視為已驗證。

## Monorepo 邊界

monorepo 是已確認的組織方向。2026-10-14 使用者已授權以 SidStraw/mono-starter 初始化並先完成 STW-34。採 apps/web、packages/core、框架中立 TypeScript／Vite+／pnpm workspace，靜態部署 GitHub Pages。此實作決定取代先前尚未選定工具鏈的階段。

共用解析、轉換及診斷能力可在多個交付形式出現真實需求後抽取；不同工具也可有獨立 runtime。不得只因 monorepo 就預先建立所有 apps／packages、強制共享實作或將題目池視為全量實作承諾。

## 可追溯資料

- [跨族群工具站評估](../research/tool-portfolio-review-2026-10-14/README.md)
- [2026-10-04 題目池總覽](../research/keyword-review-2026-10-04/README.md)
- [第一輪 Web 篩選快照](../research/keyword-review-2026-10-04/initial-web-review.md)
- [逐詞決策](../research/keyword-review-2026-10-04/keyword-decisions.json)
