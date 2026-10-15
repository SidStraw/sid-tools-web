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
] as const;
export type Route = (typeof routes)[number];
