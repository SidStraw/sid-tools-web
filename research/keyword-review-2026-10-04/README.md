# 關鍵字題目池：Monorepo，Web 優先

更新日期：2026-10-04；最終核對：2026-10-05。使用者已確認 **monorepo 不限 Web；有發展空間先納入，交付順序以 Web 優先**。正式方向見 [產品方向文件](../../docs/product-direction.md)。

## 目前結果

- **37 張候選卡（STW-1～STW-37）**：原有 17 張保留，再新增 20 張。
- **24 張 Web 優先候選**：6 張 High、18 張 Medium。
- **13 張後續交付／探索候選**：Low 表示順序較後，不等於價值低；包含需 repo、IDE、常駐服務或較高探索成本的工具。
- 全部為 **Needs Refinement**；35 張 feature、2 張 spike。CLI 顯示的 dependency readiness 不等於產品或市場驗證通過。
- 原有 17 張補上交付形式與延伸方向，驗收條件保持其 Web 首版範圍。同成果的 CLI／CI 延伸不重複開卡。

來源仍為 [SidStraw/keyword-pipeline-auto](https://github.com/SidStraw/keyword-pipeline-auto/tree/2fe7b09f59f721a02c558cbd6f73cc8f218ce007) 的同一 commit：239 份報告、4,021 筆可讀取紀錄、1,766 個唯一詞。此次共 **505 個唯一詞合併進候選題目**，其餘 **1,261 個詞不另開卡**。新增對應 303 個先前延後的唯一詞；來源觀測資料未修改。

第一輪的 17 張／202 個詞結果保留在 [歷史報告](initial-web-review.md) 與 [歷史逐詞決策](initial-web-decisions.json)，不再作為目前的 Web-only 限制。

## 篩選原則的調整

先判斷「能否解決具體問題、是否有值得驗證的發展方向」，再決定介面及實作位置。需要讀 repo、跑 build、用 IDE 上下文或有後端服務，改列為交付成本，不作為低價值的充分理由。成熟工具可作為整合基礎及比較基準，仍需說清楚額外使用價值。

Web-first 是排序偏好，不等於所有題目只能在瀏覽器運算。跨平台需求可以保留，但每張卡仍有明確的首版與待驗證事項；「先納入」不等於立即實作全部功能。

仍排除偏題、重複開卡及錯誤安全承諾；沒有足夠具體差異的泛用工具維持觀察。`online`／`free`／語言或套件變體只提供相關意圖，不代表首版支援每種語言、引擎或產品。逐詞紀錄是候選歸類，不是 SEO landing page 的目標詞清單。

## Web 優先候選

| 卡片 | 優先 | 主要形式 | 題目 | 合併詞數 |
|---|---|---|---|---:|
| [STW-1](../../backlog/tasks/stw-1%20-%20%E7%92%B0%E5%A2%83%E8%A8%AD%E5%AE%9A%E9%A0%90%E6%AA%A2%EF%BC%9A%E6%AF%94%E5%B0%8D-.env-%E7%AF%84%E6%9C%AC%E3%80%81%E7%BC%BA%E6%BC%8F%E8%88%87%E9%87%8D%E8%A4%87%E9%8D%B5.md) | High | 純 Web | 環境設定預檢：比對 .env 範本、缺漏與重複鍵 | 16 |
| [STW-2](../../backlog/archive/tasks/stw-2%20-%20YAML-%E8%BD%89-.env%EF%BC%9A%E9%A0%90%E8%A6%BD%E6%89%81%E5%B9%B3%E5%8C%96%E8%A6%8F%E5%89%87%E8%88%87%E9%8D%B5%E5%90%8D%E8%A1%9D%E7%AA%81.md) | High | 純 Web | YAML 轉 .env：預覽扁平化規則與鍵名衝突 | 8 |
| [STW-3](../../backlog/tasks/stw-3%20-%20API-JSON-%E5%B7%AE%E7%95%B0%E6%AF%94%E8%BC%83%EF%BC%9A%E5%BF%BD%E7%95%A5%E5%8B%95%E6%85%8B%E6%AC%84%E4%BD%8D%E4%B8%A6%E4%BE%9D%E8%AD%98%E5%88%A5%E9%8D%B5%E5%B0%8D%E9%BD%8A%E9%99%A3%E5%88%97.md) | High | 純 Web | API JSON 差異比較：忽略動態欄位並依識別鍵對齊陣列 | 5 |
| [STW-4](../../backlog/archive/tasks/stw-4%20-%20Markdown-%E8%A1%A8%E6%A0%BC%E6%95%B4%E7%90%86%E8%88%87-JSON%EF%BC%8F%E8%A9%A6%E7%AE%97%E8%A1%A8%E6%96%87%E5%AD%97%E4%BA%92%E8%BD%89.md) | High | 純 Web | Markdown 表格整理與 JSON／試算表文字互轉 | 8 |
| [STW-5](../../backlog/tasks/stw-5%20-%20Cron-%E6%8E%92%E7%A8%8B%E9%A0%90%E8%A6%BD%EF%BC%9A%E6%99%82%E5%8D%80%E5%B0%8D%E7%85%A7%E3%80%81%E4%B8%8B%E6%AC%A1%E5%9F%B7%E8%A1%8C%E8%88%87-DST-%E6%8F%90%E7%A4%BA.md) | High | 純 Web | Cron 排程預覽：時區對照、下次執行與 DST 提示 | 48 |
| [STW-6](../../backlog/tasks/stw-6%20-%20OpenAPI-%E5%90%88%E7%B4%84%E5%B7%AE%E7%95%B0%E6%AA%A2%E6%9F%A5%EF%BC%9A%E5%8D%80%E5%88%86-request-%E8%88%87-response-%E7%9A%84%E7%9B%B8%E5%AE%B9%E6%80%A7.md) | High | 純 Web | OpenAPI 合約差異檢查：區分 request 與 response 的相容性 | 2 |
| [STW-7](../../backlog/tasks/stw-7%20-%20CSS-selector-%E6%AF%94%E8%BC%83%EF%BC%9A%E7%89%B9%E7%95%B0%E6%80%A7%E6%8B%86%E8%A7%A3%E8%88%87-HTML-%E5%91%BD%E4%B8%AD%E9%A0%90%E8%A6%BD.md) | Medium | 純 Web | CSS selector 比較：特異性拆解與 HTML 命中預覽 | 13 |
| [STW-8](../../backlog/tasks/stw-8%20-%20Docker-Compose-%E9%9D%9C%E6%85%8B%E9%A0%90%E6%AA%A2%E8%88%87%E6%9C%8D%E5%8B%99%E7%9B%B8%E4%BE%9D%E5%9C%96.md) | Medium | 純 Web | Docker Compose 靜態預檢與服務相依圖 | 12 |
| [STW-9](../../backlog/archive/tasks/stw-9%20-%20CSS-%E8%BD%89-Tailwind-v4%EF%BC%9A%E6%94%AF%E6%8F%B4%E7%AF%84%E5%9C%8D%E5%85%A7%E8%BD%89%E6%8F%9B%E8%88%87%E6%9C%AA%E8%BD%89%E6%8F%9B%E9%A0%85%E7%9B%AE%E6%B8%85%E5%96%AE.md) | Medium | 純 Web | CSS 轉 Tailwind v4：支援範圍內轉換與未轉換項目清單 | 13 |
| [STW-10](../../backlog/tasks/stw-10%20-%20Git-diff-%E6%AA%A2%E8%A6%96%E8%88%87%E5%8F%AF%E5%88%86%E4%BA%AB%E7%9A%84%E7%A2%BA%E5%AE%9A%E6%80%A7%E8%AE%8A%E6%9B%B4%E6%91%98%E8%A6%81.md) | Medium | 純 Web | Git diff 檢視與可分享的確定性變更摘要 | 9 |
| [STW-11](../../backlog/tasks/stw-11%20-%20GraphQL-schema-%E5%B7%AE%E7%95%B0%E6%AA%A2%E6%9F%A5%E8%88%87%E5%BD%B1%E9%9F%BF%E5%9E%8B%E5%88%A5%E5%B0%8E%E8%A6%BD.md) | Medium | 純 Web | GraphQL schema 差異檢查與影響型別導覽 | 11 |
| [STW-12](../../backlog/tasks/stw-12%20-%20PostgreSQL-EXPLAIN-%E8%A8%88%E7%95%AB%E6%AA%A2%E8%A6%96%EF%BC%9A%E4%BC%B0%E8%A8%88%E8%88%87%E5%AF%A6%E9%9A%9B%E5%9F%B7%E8%A1%8C%E5%B7%AE%E8%B7%9D.md) | Medium | 純 Web | PostgreSQL EXPLAIN 計畫檢視：估計與實際執行差距 | 5 |
| [STW-13](../../backlog/tasks/stw-13%20-%20SQL-DDL-%E8%BD%89-ER-%E9%97%9C%E8%81%AF%E5%9C%96%E8%88%87%E5%8F%AF%E5%8C%AF%E5%87%BA%E7%9A%84%E8%B3%87%E6%96%99%E8%A1%A8%E6%96%87%E4%BB%B6.md) | Medium | 純 Web | SQL DDL 轉 ER 關聯圖與可匯出的資料表文件 | 20 |
| [STW-14](../../backlog/tasks/stw-14%20-%20OpenAPI-%E5%9B%9E%E6%87%89%E7%AF%84%E4%BE%8B%E7%94%A2%E7%94%9F%E5%99%A8%EF%BC%9A%E5%8F%AF%E9%A9%97%E8%AD%89%E3%80%81%E5%8F%AF%E9%87%8D%E7%8F%BE%E7%9A%84-mock-fixture.md) | Medium | 純 Web | OpenAPI 回應範例產生器：可驗證、可重現的 mock fixture | 10 |
| [STW-15](../../backlog/tasks/stw-15%20-%20Markdown-%E8%BD%89-HTML-Email%EF%BC%9A%E8%A1%A8%E6%A0%BC%E3%80%81%E7%A8%8B%E5%BC%8F%E7%A2%BC%E8%88%87%E8%A4%87%E8%A3%BD%E9%A0%90%E8%A6%BD.md) | Medium | 純 Web | Markdown 轉 HTML Email：表格、程式碼與複製預覽 | 12 |
| [STW-16](../../backlog/tasks/stw-16%20-%20Lighthouse-%E5%A0%B1%E5%91%8A%E6%AF%94%E8%BC%83%EF%BC%9A%E5%8D%80%E5%88%86%E6%8C%87%E6%A8%99%E8%AE%8A%E5%8C%96%E8%88%87%E6%B8%AC%E8%A9%A6%E6%A2%9D%E4%BB%B6%E5%B7%AE%E7%95%B0.md) | Medium | 純 Web | Lighthouse 報告比較：區分指標變化與測試條件差異 | 3 |
| [STW-17](../../backlog/tasks/stw-17%20-%20Sitemap-XML-%E9%A0%90%E6%AA%A2%E8%88%87%E7%AB%99%E9%BB%9E%E7%B5%90%E6%A7%8B%E7%80%8F%E8%A6%BD.md) | Medium | 純 Web | Sitemap XML 預檢與站點結構瀏覽 | 7 |
| [STW-26](../../backlog/archive/tasks/stw-26%20-%20API-Rate-Limit-%E6%A8%A1%E6%93%AC%E5%99%A8%EF%BC%9A%E7%AA%81%E7%99%BC%E6%B5%81%E9%87%8F%E8%88%87%E7%AD%89%E5%BE%85%E6%99%82%E9%96%93%E9%A0%90%E8%A6%BD.md) | Medium | 純 Web | API Rate Limit 模擬器：突發流量與等待時間預覽 | 13 |
| [STW-27](../../backlog/tasks/stw-27%20-%20Markdown-%E5%88%B0-Confluence-%E7%9A%84%E6%A0%BC%E5%BC%8F%E6%90%8D%E5%A4%B1%E9%A0%90%E6%AA%A2%E8%88%87%E5%8C%AF%E5%85%A5%E8%BC%94%E5%8A%A9.md) | Medium | Web＋平台整合 | Markdown 到 Confluence 的格式損失預檢與匯入輔助 | 11 |
| [STW-28](../../backlog/tasks/stw-28%20-%20Markdown-%E5%88%B0-Notion-%E7%9A%84%E6%89%B9%E6%AC%A1%E7%B5%90%E6%A7%8B%E8%88%87%E9%80%A3%E7%B5%90%E4%BF%9D%E7%95%99%E6%AA%A2%E6%9F%A5.md) | Medium | Web＋平台整合 | Markdown 到 Notion 的批次結構與連結保留檢查 | 7 |
| [STW-29](../../backlog/archive/tasks/stw-29%20-%20API-%E7%AF%84%E4%BE%8B%E6%8E%A8%E5%B0%8E-TypeScript%EF%BC%8FZod%EF%BC%9A%E5%91%88%E7%8F%BE%E5%9E%8B%E5%88%A5%E4%BE%9D%E6%93%9A%E8%88%87%E4%B8%8D%E7%A2%BA%E5%AE%9A%E6%80%A7.md) | Medium | 純 Web | API 範例推導 TypeScript／Zod：呈現型別依據與不確定性 | 29 |
| [STW-34](../../backlog/tasks/stw-34%20-%20%E6%89%B9%E6%AC%A1%E5%9C%96%E7%89%87%E6%9C%80%E4%BD%B3%E5%8C%96%EF%BC%9A%E4%BE%9D%E7%9B%AE%E6%A8%99%E5%A4%A7%E5%B0%8F%E8%88%87%E5%B0%BA%E5%AF%B8%E9%A0%90%E7%AE%97%E5%8C%AF%E5%87%BA.md) | Medium | 純 Web | 批次圖片最佳化：依目標大小與尺寸預算匯出 | 11 |
| [STW-35](../../backlog/tasks/stw-35%20-%20%E5%9C%96%E7%89%87%E8%89%B2%E7%9B%A4%E5%88%B0%E5%8F%AF%E8%AE%80%E7%9A%84%E4%BB%8B%E9%9D%A2%E9%85%8D%E8%89%B2%E8%88%87-token-%E5%8C%AF%E5%87%BA.md) | Medium | 純 Web | 圖片色盤到可讀的介面配色與 token 匯出 | 36 |
| [STW-37](../../backlog/tasks/stw-37%20-%20SemVer-%E7%AF%84%E5%9C%8D%E8%88%87%E5%8D%87%E7%B4%9A%E6%A2%9D%E4%BB%B6%E7%9A%84%E4%BA%92%E5%8B%95%E5%BC%8F%E6%AA%A2%E6%9F%A5.md) | Medium | 純 Web | SemVer 範圍與升級條件的互動式檢查 | 9 |

## 後續交付與探索候選

| 卡片 | 優先 | 主要形式 | 題目 | 合併詞數 |
|---|---|---|---|---:|
| [STW-18](../../backlog/tasks/stw-18%20-%20Monorepo-%E7%9B%B8%E4%BE%9D%E5%9C%96%E8%88%87%E9%87%8D%E8%A4%87%E5%A5%97%E4%BB%B6%E8%BF%BD%E8%B9%A4.md) | Low | 本機 CLI＋Web | Monorepo 相依圖與重複套件追蹤 | 30 |
| [STW-19](../../backlog/tasks/stw-19%20-%20Bundle-%E8%AE%8A%E5%8C%96%E5%88%86%E6%9E%90%EF%BC%9A%E5%BE%9E%E9%AB%94%E7%A9%8D%E5%A2%9E%E5%8A%A0%E8%BF%BD%E5%88%B0%E5%A5%97%E4%BB%B6%E8%88%87%E5%85%A5%E5%8F%A3.md) | Low | 本機 CLI＋Web | Bundle 變化分析：從體積增加追到套件與入口 | 12 |
| [STW-20](../../backlog/tasks/stw-20%20-%20%E6%9C%AA%E4%BD%BF%E7%94%A8%E7%A8%8B%E5%BC%8F%E7%A2%BC%E8%88%87%E7%9B%B8%E4%BE%9D%E5%A5%97%E4%BB%B6%E7%9A%84%E5%AF%A9%E6%9F%A5%E5%B7%A5%E4%BD%9C%E6%B5%81%E7%A8%8B.md) | Low | CLI／CI | 未使用程式碼與相依套件的審查工作流程 | 5 |
| [STW-21](../../backlog/tasks/stw-21%20-%20%E9%A9%97%E8%AD%89-TypeScript-%E5%9E%8B%E5%88%A5%E5%B1%95%E9%96%8B%E8%88%87%E9%8C%AF%E8%AA%A4%E8%A7%A3%E9%87%8B%E5%B7%A5%E5%85%B7%E7%9A%84%E5%83%B9%E5%80%BC.md) | Low | IDE 探索 | 驗證 TypeScript 型別展開與錯誤解釋工具的價值 | 6 |
| [STW-22](../../backlog/tasks/stw-22%20-%20%E5%85%83%E4%BB%B6-Props-%E6%96%87%E4%BB%B6%E8%88%87%E4%BD%BF%E7%94%A8%E7%AF%84%E4%BE%8B%E7%9A%84%E5%90%8C%E6%AD%A5%E6%AA%A2%E6%9F%A5.md) | Low | CLI／CI | 元件 Props 文件與使用範例的同步檢查 | 2 |
| [STW-23](../../backlog/tasks/stw-23%20-%20Webhook-%E6%94%B6%E4%BB%B6%E3%80%81%E9%81%AE%E8%94%BD%E8%88%87%E5%8F%97%E6%8E%A7%E9%87%8D%E9%80%81%E5%B7%A5%E4%BD%9C%E5%8F%B0.md) | Low | Web＋執行服務 | Webhook 收件、遮蔽與受控重送工作台 | 5 |
| [STW-24](../../backlog/tasks/stw-24%20-%20%E5%8F%AF%E5%88%87%E6%8F%9B%E6%83%85%E5%A2%83%E7%9A%84-OpenAPI-Mock-API-%E6%9C%8D%E5%8B%99.md) | Low | Web＋執行服務 | 可切換情境的 OpenAPI Mock API 服務 | 13 |
| [STW-25](../../backlog/tasks/stw-25%20-%20API-%E5%9B%9E%E6%87%89%E6%99%82%E9%96%93%E8%88%87%E5%8F%AF%E7%94%A8%E6%80%A7%E7%9A%84%E8%BC%95%E9%87%8F%E7%9B%A3%E6%B8%AC.md) | Low | Web＋執行服務 | API 回應時間與可用性的輕量監測 | 2 |
| [STW-30](../../backlog/tasks/stw-30%20-%20%E5%8A%A0%E5%AF%86%E7%92%B0%E5%A2%83%E8%A8%AD%E5%AE%9A%E7%9A%84%E6%9C%AC%E6%A9%9F%E4%BA%A4%E6%8E%A5%E8%88%87%E9%83%A8%E7%BD%B2%E9%A0%90%E6%AA%A2.md) | Low | CLI／CI | 加密環境設定的本機交接與部署預檢 | 18 |
| [STW-31](../../backlog/archive/tasks/stw-31%20-%20Git-%E8%AE%8A%E6%9B%B4%E7%B4%80%E9%8C%84%E6%95%B4%E7%90%86%E8%88%87%E5%8F%AF%E5%AF%A9%E6%9F%A5%E7%9A%84-Release-Notes-%E8%8D%89%E7%A8%BF.md) | Low | CLI／CI | Git 變更紀錄整理與可審查的 Release Notes 草稿 | 42 |
| [STW-32](../../backlog/tasks/stw-32%20-%20Dockerfile-%E8%AE%8A%E6%9B%B4%E9%A0%90%E6%AA%A2%E8%88%87%E6%8E%83%E6%8F%8F%E7%B5%90%E6%9E%9C%E6%95%B4%E5%90%88.md) | Low | CLI／CI | Dockerfile 變更預檢與掃描結果整合 | 20 |
| [STW-33](../../backlog/tasks/stw-33%20-%20%E9%A9%97%E8%AD%89%E6%88%AA%E5%9C%96%E8%BD%89%E5%85%83%E4%BB%B6%E8%8D%89%E7%A8%BF%E8%88%87%E8%A6%96%E8%A6%BA%E5%B7%AE%E7%95%B0%E6%AA%A2%E6%9F%A5%E7%9A%84%E5%8F%AF%E8%A1%8C%E6%80%A7.md) | Low | Web＋AI 探索 | 驗證截圖轉元件草稿與視覺差異檢查的可行性 | 20 |
| [STW-36](../../backlog/tasks/stw-36%20-%20Markdown-%E6%96%87%E4%BB%B6%E7%9A%84%E7%9B%B8%E5%B0%8D%E9%80%A3%E7%B5%90%E8%88%87-anchor-%E6%89%B9%E6%AC%A1%E6%AA%A2%E6%9F%A5.md) | Low | CLI／CI | Markdown 文件的相對連結與 anchor 批次檢查 | 12 |

STW-21（型別展開）與 STW-33（截圖轉元件）是 spike，驗收的是可行性比較與決策，不能因此宣稱工具已完成。其他卡片的驗收條件描述未來功能成果，目前均未勾選。

## 相似題目的邊界

- **STW-1／STW-30**：前者檢查明文 .env 的鍵名、缺漏與語法；後者處理既有加密格式的交接及部署預檢。
- **STW-3／STW-25**：前者比較兩份 JSON；後者持續量測 endpoint 的可用性與延遲。
- **STW-4／STW-27／STW-28**：一般表格整理、Confluence 內容表示法、Notion 文件結構各有不同驗收結果。
- **STW-10／STW-31**：單份 patch 的審查摘要，與一段 commit 歷史的 release 草稿分開。
- **STW-14／STW-24**：fixture 檔案產生，與真的接收請求、可切換情境的 Mock API runtime 分開。
- **STW-16／STW-19**：Lighthouse 的 runtime audit 與 bundler 產物體積歸因使用不同證據。
- **STW-18／STW-20**：相依來源及重複版本的理解，與未使用項目的清理審查分開。
- **STW-17／STW-36**：sitemap XML 產物檢查，與 repo Markdown 的相對路徑／anchor 檢查分開。

這些題目可能共用解析或展示能力，但目前沒有因此增加硬相依。workspace 與共用套件切法留到選定實際工具時確認。

## 既有工具抽查與發展假設

先前的 [官方工具抽查](initial-web-review.md#既有工具與官方文件抽查2026-10-04) 仍可作為比較基準，不能單憑「已有工具」就推論沒有空間。本輪另外確認：

| 一手來源 | 已確認能力 | 本輪保留的待驗證切角 |
|---|---|---|
| [Knip](https://knip.dev/) | 已能分析 JS／TS 專案的未使用相依、exports 與檔案。 | STW-20 先研究如何整合審查、baseline 與誤判處理，不先重造引擎。 |
| [Prism](https://github.com/stoplightio/prism) | 可從 API 定義提供 mock server。 | STW-24 比較情境切換與 Web 操作流程的額外價值。 |
| [Notion 匯入文件](https://www.notion.com/help/import-data-into-notion#text-and-markdown) | 已可匯入 Markdown／ZIP；anchor 與非標準 Markdown 有限制。 | STW-28 聚焦連結、資源與損失預檢；不能只複製原生上傳功能。 |
| [Webhook.site](https://webhook.site/) | 已提供 Web 請求接收與檢視工具。 | STW-23 需驗證自架／本機與受控重送的需求，不能直接推論尚無競爭。 |

以上是能力抽查與產品假設，不是完整競品或 SERP 排名研究。卡片中的市場價值、轉換率與營收尚未證實。

## 資料覆蓋與可信度


| 項目 | 結果 |
|---|---:|
| 原始報告區間（UTC） | 2026-01-13～2026-09-08 |
| main 快照內 Markdown 報告 | 239 |
| logs/index.json 與實際報告清單 | 完全一致 |
| 含 All Keywords 表格 | 237 |
| 僅保存 Top 5 的早期報告 | 2 |
| 各報告宣告 Keywords found 合計 | 4,046 |
| 可逐筆讀取的關鍵字紀錄 | 4,021 |
| 未保存完整明細、無法還原 | 25 |
| 正規化後唯一詞（小寫、合併空白） | 1,766 |
| competition = 0 的可讀取紀錄 | 3,090（約 76.8%） |

最早兩份 [logs/2026_01/13_055344.md](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/13_055344.md) 與 [logs/2026_01/14_035354.md](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/14_035354.md) 各只保存 5 筆，宣告總數分別為 16 與 19。缺少的 11 + 14 筆沒有補造，也沒有從 AI 摘要反推成原始量測。其餘 237 份皆核對表格列數與報告總數一致。

只分析此 commit 中已提交的報告，不宣稱涵蓋未提交的 Google Sheets、失敗的 Actions 執行或後續日期。AI 摘要與 seeds 用於理解資料產生流程，沒有當成新增的搜尋證據。

### 已證實的來源限制

1. **competition 不是完整競爭度，也不是搜尋量。** [keywordService.ts 第 66–84 行](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/services/keywordService.ts#L66-L84) 使用回傳 organic 的筆數，10 筆被換成 100。來源只保存通過篩選的資料，並非市場全樣本。
2. **API 錯誤會被寫成 0。** [第 85–96 行](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/services/keywordService.ts#L85-L96) 的 catch 回傳 0，之後仍可能通過 [低競爭篩選](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/index.ts#L217-L224)。不能區分哪些歷史 0 是無結果、哪些是 API 錯誤。
3. **2026-06～09 的 2,166 筆可讀取紀錄全部為 0。** 這是資料品質警訊，但沒有歷史原始 API 回應，不能斷言這些紀錄全都失敗。
4. **取樣本身有偏差。** 每個 AI／人工 seed 最多取前 5 個建議；[AI 摘要僅取得前 10 個詞與彙總統計](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/services/aiService.ts#L131-L146)。同一 pipeline 的反覆出現不能當成多個獨立使用者的需求。
5. **AI 的排名及營收敘述未獲驗證。** 不採用摘要中的「藍海」、「保證首頁」或推測搜尋量排序；本次也沒有取得 Search Console、Keyword Planner 或轉換率資料。

## 尚未獨立開卡的詞

每個詞只有一個主要去向；這些數量不能直接當成被否定的產品數。同義詞、教學與套件導航詞通常只需作為某題的背景。

| 原因碼 | 唯一詞數 | 目前解釋 |
|---|---:|---|
| `information` | 177 | 排除獨立題目：概念、範例、教學或排錯文章意圖，尚不足以成立新的互動工具。 |
| `secret-management` | 4 | 未另開卡的秘密管理詞，需確認是否屬於 STW-30 的環境設定交接或另外的 vault 產品，不因高成本直接判低價值。 |
| `generic-utility` | 347 | 本輪尚未形成新的、不重複的產品情境；有成熟替代方案不等於沒有發展空間，後續有具體差異仍可納入。 |
| `ai-or-unproven` | 63 | 未另開卡的 AI／runtime 題目仍待定義具體成果；已納入兩張探索卡，不因使用 AI 自動排除。 |
| `navigation` | 125 | 排除獨立題目：主要尋找既有產品、套件、平台外掛或指令；可保留為背景參考。 |
| `insufficient-intent` | 28 | 暫不納入：未形成輸入、輸出與價值均明確的工具情境；這是本輪篩選，不表示沒有市場。 |
| `off-topic` | 37 | 排除：搜尋建議偏離開發工具意圖，或與本專案無關。 |
| `infrastructure` | 94 | 暫不另開卡：已重新檢視 CLI／IDE／服務形式，這個詞尚未對應足夠具體且不重複的成果；需要後端或本機權限本身不是排除理由。 |
| `platform-specific` | 136 | 不依語言／平台變體另開卡；若能支持已保留題目，可在細化時納入對應介面，未列為現有首版支援承諾。 |
| `semantic-conversion` | 88 | 尚未形成額外獨立題目；部分平台匯入已重新納入，其他語意轉換需先明確輸入、輸出及保真邊界。 |
| `commodity-typegen` | 39 | 未另開卡的型別轉換詞，需確認是否屬於 STW-29 的多樣本推導或具有不同成果；現有工具是比較基準，不是排除新題目的充分理由。 |
| `native-conversion` | 19 | 暫不納入：OpenAPI 匯入 Postman 已有原生路徑；反向或其他跨協定轉換需先證明語意保真與額外需求。 |
| `commodity-regex` | 100 | 暫不納入：regex101 已有多引擎、解釋、除錯與測試流程；此批資料尚未證實另一個通用 regex 工具的差異。 |
| `unsafe-premise` | 4 | 排除：以 regex 防止 SQL injection 的前提不可靠，不將錯誤安全承諾產品化。 |

本輪重新納入的詞保留 `previous_decision`／`previous_reason`，方便追查為何改變判斷。沒有因修改評估範圍就重寫原始 competition 或補造缺少的紀錄。

## 查看卡片

```sh
pnpm tasks
pnpm exec backlog task list --labels web-first --plain
pnpm exec backlog task list --labels later-delivery --plain
pnpm tasks:web
pnpm tasks:doctor
```

Backlog.md 1.53.0 仍為專案本地 devDependency、filesystem-only 模式。專案尚未建立實際 app／workspace；此次僅更新題目池、方向與追溯資料。

## 追溯與核對

- [產品方向](../../docs/product-direction.md)：使用者確認的 monorepo／Web 優先原則與交付標籤。
- [source-evidence.json](source-evidence.json)：未修改的來源觀測與固定 commit。
- [keyword-decisions.json](keyword-decisions.json)：目前逐詞去向與 task ID。
- [initial-web-review.md](initial-web-review.md)／[initial-web-decisions.json](initial-web-decisions.json)：第一輪歷史快照。
- 37 張候選卡都有來源及未勾選驗收條件，原 17 張的驗收條件與狀態保持原樣。
- 每個唯一詞只有一筆決策，每個納入詞只對應一張卡；每張卡都有主要交付形式與排序標籤。
- `backlog doctor` 檢查 ID 與相依關係；這不是產品功能已通過驗收的證據。
