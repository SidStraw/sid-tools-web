export const SITE_ORIGIN = 'https://tools.sid.tw';
export const routes = [
  {
    id: 'images',
    path: '',
    label: '圖片壓縮',
    title: '批次圖片壓縮・指定大小與尺寸',
    description: '免費批次圖片壓縮：指定大小、尺寸與格式，逐張檢查並下載 ZIP。圖片留在瀏覽器。',
  },
  {
    id: 'lighthouse',
    path: 'tools/lighthouse/',
    label: 'Lighthouse 比較',
    title: 'Lighthouse 報告比較',
    description: '比較 Lighthouse 分數、原始指標與測試條件，辨識不同裝置及網路設定。報告不上傳。',
  },
  {
    id: 'json-diff',
    path: 'tools/json-diff/',
    label: 'JSON 差異',
    title: 'JSON 差異比較',
    description: '保留大整數的 API JSON 比較，支援忽略路徑、陣列 ID 對齊與下載差異。資料不上傳。',
  },
  {
    id: 'cron',
    path: 'tools/cron/',
    label: 'Cron 預覽',
    title: 'Cron 排程與時區預覽',
    description: '預覽五欄 Unix Cron 未來十次執行時間，對照 IANA 時區與夏令時間。',
  },
  {
    id: 'semver',
    path: 'tools/semver/',
    label: 'SemVer 範圍',
    title: 'SemVer 版本範圍比較',
    description:
      '用自訂版本清單比較 npm SemVer 範圍，逐筆查看新增、移除與 prerelease 原因。資料不上傳。',
  },
  {
    id: 'env-check',
    path: 'tools/env-check/',
    label: '.env 預檢',
    title: '.env 範本與環境設定預檢',
    description:
      '在瀏覽器比對 .env 範本，定位缺漏、多餘、重複與空值。預設遮蔽輸入，報告只含鍵名與問題。',
  },
  {
    id: 'git-diff',
    path: 'tools/git-diff/',
    label: 'Git diff 檢視',
    title: 'Git diff 檢視與選取摘錄',
    description:
      '在瀏覽器檢視 Git unified diff、來源行與確定性統計，明確選取檔案及 hunk，預覽後下載審查摘錄。不上傳。',
  },
  {
    id: 'sitemap',
    path: 'tools/sitemap/',
    label: 'Sitemap 預檢',
    title: 'Sitemap XML 預檢與路徑瀏覽',
    description:
      '在瀏覽器檢查 Sitemap XML 結構、URL、重複與 lastmod，依原始條目瀏覽路徑樹。不爬站、不查收錄。',
  },
  {
    id: 'explain',
    path: 'tools/explain/',
    label: 'EXPLAIN 檢視',
    title: 'PostgreSQL EXPLAIN JSON 計畫檢視',
    description:
      '在瀏覽器瀏覽 PostgreSQL EXPLAIN JSON 節點樹、估計與實測 rows 差距，依 JSON Pointer 回到來源。不連資料庫、不執行 SQL。',
  },
  {
    id: 'palette',
    path: 'tools/palette/',
    label: '圖片配色',
    title: '圖片取色、WCAG 對比與 CSS token',
    description:
      '從本機靜態圖片取得取樣色盤，調整文字、底色與強調色，依透明混色條件檢查 WCAG 對比，明確選取 CSS variables。不傳送圖片。',
  },
  {
    id: 'selectors',
    path: 'tools/selectors/',
    label: 'Selector 比較',
    title: 'CSS selector 特異性與隔離結構命中',
    description:
      '比較 CSS selector 三元組與來源貢獻，在離線解析的純文字 HTML 結構上查看靜態命中。不渲染 HTML，不模擬完整 cascade。',
  },
  {
    id: 'sdl',
    path: 'tools/sdl/',
    label: 'GraphQL 差異',
    title: 'GraphQL SDL 差異與型別導覽',
    description:
      '在瀏覽器比較兩份 SDL，區分 breaking、dangerous、non-breaking 與 unknown，查看型別、欄位和直接引用；不連線 API、不推論 resolver 相容性。',
  },
  {
    id: 'openapi',
    path: 'tools/openapi/',
    label: 'OpenAPI 差異',
    title: 'OpenAPI 3.0 合約差異與來源導覽',
    description:
      '本機比較兩份 JSON／YAML OpenAPI 3.0.x，區分 request／response 的靜態規則、未知與需審查項目，查看引用使用點與定義；不連線 API 或載入外部引用。',
  },
  {
    id: 'openapi-fixture',
    path: 'tools/openapi-fixture/',
    label: '回應 Fixture',
    title: 'OpenAPI 回應 Fixture 產生與驗證',
    description:
      '明確選擇 OpenAPI 3.0.x 回應，以固定 seed 產生有界 JSON 測試 fixture，查看 example 來源、獨立驗證與限制；不連線 API，不自動匿名化。',
  },
  {
    id: 'sql-ddl',
    path: 'tools/sql-ddl/',
    label: 'SQL 關聯圖',
    title: 'SQL DDL 關聯圖與資料表文件',
    description:
      '本機讀取有界 PostgreSQL CREATE TABLE 子集，以原生 SVG 查看資料表、欄位、明示外鍵與來源；區分已解析、本機候選與未解決，不連線資料庫、不執行 migration。',
  },
] as const;
export type Route = (typeof routes)[number];
