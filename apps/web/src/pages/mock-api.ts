import html from './mock-api.html?raw';
import type { MockChoice, MockState } from '@sid-tools/core/mock-runtime';
export { html };
interface Snapshot {
  state: MockState;
  choices: MockChoice[];
  notices: string[];
  engine: { name: string; version: string };
  mockBase: string;
}
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#mock-${id}`)!;
  const operation = get<HTMLSelectElement>('operation'),
    choice = get<HTMLSelectElement>('choice'),
    delay = get<HTMLInputElement>('delay'),
    connect = get<HTMLButtonElement>('connect'),
    apply = get<HTMLButtonElement>('apply');
  const events = new AbortController();
  let request: AbortController | undefined,
    snapshot: Snapshot | undefined,
    revision = 0;
  const local = location.hostname === '127.0.0.1' && location.protocol === 'http:';
  connect.disabled = !local;
  if (!local)
    get('status').textContent =
      '請先啟動 CLI，再開啟它印出的 127.0.0.1 網址。此頁不會連線你的 localhost。';
  const on = (el: HTMLElement, event: string, fn: () => void) =>
    el.addEventListener(event, fn, { signal: events.signal });
  function clear() {
    revision++;
    request?.abort();
    request = undefined;
    snapshot = undefined;
    get('controls').hidden = true;
    get('fixture').replaceChildren();
    get('fixture').hidden = true;
    operation.replaceChildren();
    choice.replaceChildren();
    get('context').replaceChildren();
    get('notices').replaceChildren();
    get('current').replaceChildren();
    get('endpoint').replaceChildren();
    get('error').hidden = true;
    get('status').textContent = '頁面資料已清除；服務與已保存設定不變。';
    connect.disabled = !local;
  }
  function option(value: string, text: string) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  }
  function selection() {
    if (!snapshot) return;
    const setting = snapshot.state.settings.find((s) => s.operation === operation.value)!;
    choice.replaceChildren(
      ...snapshot.choices
        .filter((c) => c.operation === operation.value)
        .map((c) => option(c.id, `${c.status} · ${c.mediaType} · ${c.example ?? c.origin}`)),
    );
    choice.value = setting.choice;
    delay.value = String(setting.delayMs);
    get('fixture').hidden = true;
    get('fixture').replaceChildren();
    const current = snapshot.choices.find((c) => c.id === setting.choice)!;
    get('current').textContent =
      `目前保存：${current.status} · ${current.example ?? current.origin} · 延遲 ${setting.delayMs} ms。`;
    get('endpoint').textContent =
      `${current.method} ${snapshot.mockBase}${current.path}\n請把 {參數} 換成實際路徑值。`;
  }
  async function call(save: boolean) {
    if (!local || (save && !snapshot)) return;
    request?.abort();
    request = new AbortController();
    const token = ++revision,
      abort = request;
    const timeout = setTimeout(() => abort.abort(), 10_000);
    connect.disabled = true;
    apply.disabled = true;
    get('error').hidden = true;
    try {
      let next: MockState | undefined;
      if (save) {
        const ms = Number(delay.value);
        if (!delay.value || !Number.isInteger(ms) || ms < 0 || ms > 5000)
          throw new Error('延遲必須是 0–5000 的整數。');
        next = {
          ...snapshot!.state,
          settings: snapshot!.state.settings.map((s) =>
            s.operation === operation.value ? { ...s, choice: choice.value, delayMs: ms } : s,
          ),
        };
      }
      const res = await fetch('/__sidtools/state', {
        signal: abort.signal,
        cache: 'no-store',
        ...(save
          ? {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-sidtools-control': '1' },
              body: JSON.stringify(next),
            }
          : {}),
      });
      if (!res.ok)
        throw new Error(
          res.status === 409
            ? '設定已被其他視窗更新，請重新連線後再套用。'
            : '無法取得或保存設定；請確認本機服務仍在執行。',
        );
      const data = (await res.json()) as Snapshot;
      if (token !== revision) return;
      if (save) snapshot = { ...snapshot!, state: data.state };
      else {
        snapshot = data;
        operation.replaceChildren(
          ...data.state.settings.map((s) => option(s.operation, s.operation)),
        );
      }
      get('controls').hidden = false;
      get('context').textContent =
        `${snapshot.engine.name} ${snapshot.engine.version} · revision ${snapshot.state.revision} · seed ${snapshot.state.seed} · SHA256 ${snapshot.state.sourceHash}`;
      get('notices').replaceChildren(
        ...snapshot.notices.map((text) => {
          const li = document.createElement('li');
          li.textContent = text;
          return li;
        }),
      );
      selection();
      get('status').textContent = save ? '情境已保存，後續請求使用新設定。' : '已連線本機服務。';
    } catch (error) {
      if (token === revision) {
        get('error').hidden = false;
        get('error').textContent =
          error instanceof Error && error.name !== 'AbortError'
            ? error.message
            : '連線逾時；請確認服務後重新連線。';
      }
    } finally {
      clearTimeout(timeout);
      if (token === revision) {
        connect.disabled = !local;
        apply.disabled = false;
      }
    }
  }
  on(connect, 'click', () => {
    void call(false);
  });
  on(apply, 'click', () => {
    void call(true);
  });
  on(get('clear'), 'click', clear);
  on(operation, 'change', selection);
  on(choice, 'change', () => {
    get('fixture').replaceChildren();
    get('fixture').hidden = true;
  });
  on(get('preview'), 'click', () => {
    const c = snapshot?.choices.find((c) => c.id === choice.value);
    if (c) {
      get('fixture').textContent = `${c.pointer}\n${c.fixtureJson}`;
      get('fixture').hidden = false;
    }
  });
  return () => {
    clear();
    events.abort();
  };
}
