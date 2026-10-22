import './style.css';
import { routes, SITE_ORIGIN, type Route } from './routes';
type ToolModule = { html: string; mount: (root: HTMLElement) => () => void };
const loaders: Record<Route['id'], () => Promise<ToolModule>> = {
  'dockerfile-review': () => import('./pages/dockerfile-review'),
  'mock-api': () => import('./pages/mock-api'),
  images: () => import('./pages/images'),
  lighthouse: () => import('./pages/lighthouse'),
  'json-diff': () => import('./pages/json-diff'),
  cron: () => import('./pages/cron'),
  semver: () => import('./pages/semver'),
  'env-check': () => import('./pages/env-check'),
  'git-diff': () => import('./pages/git-diff'),
  sitemap: () => import('./pages/sitemap'),
  explain: () => import('./pages/explain'),
  palette: () => import('./pages/palette'),
  selectors: () => import('./pages/selectors'),
  sdl: () => import('./pages/sdl'),
  openapi: () => import('./pages/openapi'),
  'openapi-fixture': () => import('./pages/openapi-fixture'),
  'sql-ddl': () => import('./pages/sql-ddl'),
  compose: () => import('./pages/compose'),
  'unused-review': () => import('./pages/unused-review'),
  'component-docs': () => import('./pages/component-docs'),
  'bundle-diff': () => import('./pages/bundle-diff'),
  'dependency-graph': () => import('./pages/dependency-graph'),
};
const base = new URL(
  document.querySelector<HTMLMetaElement>('meta[name=app-base]')?.content ?? './',
  location.href,
).pathname;
const view = document.getElementById('app-view');
const loading = document.getElementById('route-loading'),
  message = document.getElementById('route-message'),
  retry = document.getElementById('route-retry');
if (!view || !loading || !message || !retry) throw new Error('Missing app shell');
const cache = new Map<string, Promise<ToolModule>>();
function load(route: Route) {
  let pending = cache.get(route.id);
  if (!pending) {
    pending = loaders[route.id]();
    cache.set(route.id, pending);
    void pending.catch(() => cache.delete(route.id));
  }
  return pending;
}
const findRoute = (url: URL) =>
  url.origin === location.origin
    ? routes.find(
        (r) => url.pathname === base + r.path || url.pathname === base + r.path + 'index.html',
      )
    : undefined;
let dispose: (() => void) | undefined,
  transition = 0,
  current = routes.find((r) => r.id === document.body.dataset.tool) ?? routes[0];
let attempt = () => {};
function updateShell(route: Route) {
  document.body.dataset.tool = route.id;
  document.title = `${route.title} | Sid Tools`;
  document
    .querySelector<HTMLLinkElement>('link[rel=canonical]')
    ?.setAttribute('href', `${SITE_ORIGIN}/${route.path}`);
  document
    .querySelector<HTMLMetaElement>('meta[name=description]')
    ?.setAttribute('content', route.description);
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-tool-link]')) {
    // Relative SSG links must become stable app-base links before History changes the URL.
    const target = routes.find((r) => link.dataset.route === r.id);
    if (target) {
      link.href = base + target.path;
      const active = target.id === route.id;
      link.classList.toggle('nav-active', active && Boolean(link.closest('nav')));
      if (active && link.closest('nav')) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
}
for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-tool-link]')) {
  const route = findRoute(new URL(link.href));
  if (route) {
    link.dataset.route = route.id;
    link.href = base + route.path;
  }
}
async function navigate(route: Route, push: boolean, initial = false) {
  const token = ++transition;
  loading!.hidden = false;
  if (initial) view!.inert = true;
  message!.textContent = `正在載入${route.label}…`;
  retry!.hidden = true;
  view!.setAttribute('aria-busy', 'true');
  attempt = () => {
    void navigate(route, push, initial);
  };
  try {
    const module = await load(route);
    if (token !== transition) return;
    dispose?.();
    if (!initial) view!.innerHTML = module.html;
    if (push) history.pushState(null, '', base + route.path);
    current = route;
    updateShell(route);
    dispose = module.mount(view!);
    loading!.hidden = true;
    view!.inert = false;
    view!.removeAttribute('aria-busy');
    if (!initial) {
      window.scrollTo(0, 0);
      const heading = view!.querySelector('h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
  } catch {
    if (token !== transition) return;
    message!.textContent = `${route.label}載入失敗。請檢查網路，再重新載入工具；目前輸入會清除。`;
    retry!.hidden = false;
    // Browsers cache failed module imports. A user-triggered document reload also
    // recovers stale chunk URLs after a Pages deployment without a reload loop.
    attempt = () => {
      location.assign(base + route.path);
    };
    view!.removeAttribute('aria-busy');
  }
}
retry.addEventListener('click', () => attempt());
document.addEventListener('click', (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const anchor =
    event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>('a[data-tool-link]')
      : null;
  if (!anchor || anchor.target || anchor.download) return;
  const route = findRoute(new URL(anchor.href));
  if (!route) return;
  event.preventDefault();
  if (route.id === current.id && dispose) {
    transition++;
    loading!.hidden = true;
    view!.inert = false;
    view!.removeAttribute('aria-busy');
    return;
  }
  void navigate(route, true);
});
window.addEventListener('popstate', () => {
  const route = findRoute(new URL(location.href));
  if (route && (route.id !== current.id || !dispose)) void navigate(route, false);
});
window.addEventListener('pagehide', () => {
  transition++;
  dispose?.();
  dispose = undefined;
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) void navigate(current, false);
});
void navigate(current, false, true);
