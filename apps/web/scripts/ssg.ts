import { readFileSync } from 'node:fs';
import { routes, SITE_ORIGIN } from '../src/routes';
export function renderPage(filename: string) {
  const route =
    routes.find((r) => r.path && filename.replaceAll('\\', '/').endsWith(`/${r.path}index.html`)) ??
    routes[0];
  const prefix = route.path ? '../../' : './';
  const view = readFileSync(new URL(`../src/pages/${route.id}.html`, import.meta.url), 'utf8');
  const nav = routes
    .map(
      (r) =>
        `<a data-tool-link href="${prefix}${r.path}"${r.id === route.id ? ' aria-current="page" class="nav-active"' : ''}>${r.label}</a>`,
    )
    .join('');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="${route.description}"><meta name="app-base" content="${prefix}"><link rel="canonical" href="${SITE_ORIGIN}/${route.path}"><meta name="theme-color" content="#214f43"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://static.cloudflareinsights.com/beacon.min.js https://static.cloudflareinsights.com/beacon.min.js/; style-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; connect-src https://tools.sid.tw/cdn-cgi/rum https://cloudflareinsights.com/cdn-cgi/rum; object-src 'none'; base-uri 'self'; form-action 'none'"><title>${route.title} | Sid Tools</title><link rel="icon" type="image/svg+xml" href="/favicon.svg"></head><body data-tool="${route.id}"><a class="skip-link" href="#workspace">跳至工具</a><header class="site-header"><a class="wordmark" data-tool-link href="${prefix}" aria-label="Sid Tools 首頁"><span class="brand-mark" aria-hidden="true">s<span>·</span></span>sid<span class="wordmark-light">tools</span></a><nav class="tool-nav" aria-label="工具選單">${nav}</nav><span class="local-badge"><span></span>在你的裝置處理</span></header><div id="route-loading" class="route-loading" role="status" aria-live="polite"><span id="route-message">正在載入工具…</span><button id="route-retry" class="text-button" hidden>重新載入工具</button></div><noscript><p class="result-notice">使用工具需要啟用 JavaScript。仍可透過選單瀏覽各工具說明。</p></noscript><div id="app-view">${view}</div><footer><a data-tool-link class="footer-brand" href="${prefix}">sid tools<span>為日常的小任務，留一個順手的地方。</span></a><span>輕量工具，認真做好。</span></footer><p class="privacy-note">Cloudflare Web Analytics 僅統計頁面瀏覽與效能；工具輸入、檔案內容與處理結果留在你的裝置。</p><script type="module" src="/src/router.ts"></script></body></html>`;
}
