import html from './palette.html?raw';
import { makePaletteDemo } from './palette-demos';
import type { RGB, RGBA, PaletteReport, ContrastEvaluation } from '@sid-tools/core/palette';
import type { DecodedPaletteImage } from './palette-image';
export { html };

type Role = 'foreground' | 'background' | 'accent';
const roles = [
  ['foreground', '文字', 'text'],
  ['background', '底色', 'surface'],
  ['accent', '強調', 'accent'],
] as const;
const defaults = { foreground: '#234f43', background: '#f5f3eb', accent: '#956c2a' } as const;
const rgbText = (color: RGB) => `rgb(${color.r} ${color.g} ${color.b})`;
function hexRGB(text: string): RGB {
  if (!/^#[0-9a-f]{6}$/i.test(text)) throw new Error('請使用 # 加六位 HEX 色碼；alpha 請填 0–1。');
  return {
    r: parseInt(text.slice(1, 3), 16),
    g: parseInt(text.slice(3, 5), 16),
    b: parseInt(text.slice(5, 7), 16),
  };
}

export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const value = (id: string) => get<HTMLInputElement | HTMLSelectElement>(id).value;
  const events = new AbortController();
  let renderEvents = new AbortController(),
    work = new AbortController();
  let engine: typeof import('@sid-tools/core/palette') | undefined;
  let source: File | { kind: 'forest' | 'alpha' } | undefined,
    decoded: DecodedPaletteImage | undefined,
    report: PaletteReport | undefined;
  let revision = 0,
    busy = false,
    downloadUrl = '',
    css = '';
  let resolved: Record<Role, RGB> | undefined;
  const output = get('output'),
    status = get('status'),
    error = get('error'),
    canvas = get<HTMLCanvasElement>('source-preview'),
    fileInput = get<HTMLInputElement>('palette-file');
  const tokenInputs = new Map<
    Role,
    { check: HTMLInputElement; name: HTMLInputElement; color: HTMLElement }
  >();
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }
  function revoke() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = '';
  }
  function clearTokens() {
    revoke();
    css = '';
    resolved = undefined;
    get<HTMLButtonElement>('export').disabled = true;
    get('css-output').textContent = '尚未選取 token。';
    get('token-status').textContent = '尚未選取 token。';
    for (const [role, fields] of tokenInputs) {
      fields.check.checked = false;
      fields.name.value = roles.find(([id]) => id === role)![2];
      fields.color.textContent = '尚無混色結果';
    }
  }
  function invalidateImage() {
    revision++;
    work.abort();
    work = new AbortController();
    busy = false;
    get<HTMLButtonElement>('cancel').disabled = true;
    renderEvents.abort();
    renderEvents = new AbortController();
    decoded = undefined;
    report = undefined;
    canvas.width = 0;
    canvas.height = 0;
    output.hidden = true;
    error.hidden = true;
    clearTokens();
    get('swatches').replaceChildren();
    get('source-meta').textContent = '';
    get('sample-meta').textContent = '';
    get('contrast-results').replaceChildren();
    get('resolved-colors').replaceChildren();
    get('interface-preview').style.removeProperty('color');
    get('interface-preview').style.removeProperty('background-color');
    get('accent-preview').style.removeProperty('color');
  }
  function backing(): RGB {
    if (!value('backing')) throw new Error('請先明確選擇不透明襯底；透明 pixels 不會被忽略。');
    return hexRGB(value('backing') === 'custom' ? value('custom-backing') : value('backing'));
  }
  function rgba(role: Role): RGBA {
    const text = value(`${role}-alpha`),
      alpha = Number(text);
    if (!text.trim() || !Number.isFinite(alpha) || alpha < 0 || alpha > 1)
      throw new Error('Alpha 需為 0–1 的有限數值，不能留白。');
    return { ...hexRGB(value(role)), a: alpha };
  }
  function tokenPreview() {
    revoke();
    css = '';
    get<HTMLButtonElement>('export').disabled = true;
    if (!engine || !resolved) {
      get('css-output').textContent = '配色輸入無效，無可匯出的結果。';
      get('token-status').textContent = '先修正配色輸入。';
      return;
    }
    try {
      css = engine.exportCssTokens(
        [...tokenInputs]
          .filter(([, fields]) => fields.check.checked)
          .map(([role, fields]) => ({ name: fields.name.value, color: resolved![role] })),
      );
      get('css-output').textContent = css || '尚未選取 token。';
      get('token-status').textContent = css
        ? '這是完整下載內容。僅代表此混色情境，不是無障礙合格證明。'
        : '尚未選取 token。';
      get<HTMLButtonElement>('export').disabled = !css;
    } catch {
      get('css-output').textContent = '名稱無效或重複，未產生 CSS。';
      get('token-status').textContent =
        '請使用不重複的小寫英數 kebab-case，1–64 字元，不含 --、空白或 CSS。';
    }
  }
  for (const [role, label, name] of roles) {
    const row = el('div', '', 'palette-token-row'),
      check = el('input'),
      checkLabel = el('label', `${label} · ${name}`),
      nameLabel = el('label', 'Token 名稱'),
      nameInput = el('input'),
      color = el('code', '尚無混色結果');
    check.type = 'checkbox';
    check.id = `token-${role}`;
    checkLabel.htmlFor = check.id;
    nameInput.type = 'text';
    nameInput.value = name;
    nameInput.id = `name-${role}`;
    nameInput.maxLength = 64;
    nameInput.spellcheck = false;
    nameInput.autocomplete = 'off';
    nameLabel.htmlFor = nameInput.id;
    const choice = el('div', '', 'palette-token-check'),
      field = el('div');
    choice.append(check, checkLabel);
    field.append(nameLabel, nameInput);
    row.append(choice, field, color);
    get('token-choices').append(row);
    tokenInputs.set(role, { check, name: nameInput, color });
    check.addEventListener('change', tokenPreview, { signal: events.signal });
    nameInput.addEventListener('input', tokenPreview, { signal: events.signal });
  }
  function contrastCard(title: string, data: ContrastEvaluation) {
    const card = el('section', '', 'palette-contrast-card');
    card.dataset.pair = title === '文字 / 底色' ? 'text' : 'accent';
    card.dataset.ratio = String(data.ratio);
    card.append(el('h3', title), el('strong', `${Number(data.ratio.toPrecision(9))} : 1`));
    const list = el('ul');
    for (const [key, label] of [
      ['aaNormal', 'AA 一般 ≥4.5'],
      ['aaLarge', 'AA 大型 ≥3'],
      ['aaaNormal', 'AAA 一般 ≥7'],
      ['aaaLarge', 'AAA 大型 ≥4.5'],
    ] as const) {
      const item = el('li', `${label} · ${data.passes[key] ? '通過' : '未通過'}`);
      item.dataset.threshold = key;
      item.dataset.pass = String(data.passes[key]);
      list.append(item);
    }
    card.append(list);
    return card;
  }
  function updateRoles() {
    if (!engine || !report) return;
    error.hidden = true;
    resolved = undefined;
    try {
      const text = engine.evaluateContrast(rgba('foreground'), rgba('background'), backing()),
        accent = engine.evaluateContrast(rgba('accent'), rgba('background'), backing());
      resolved = {
        foreground: text.foreground,
        background: text.background,
        accent: accent.foreground,
      };
      const preview = get('interface-preview');
      preview.hidden = false;
      preview.style.color = rgbText(text.foreground);
      preview.style.backgroundColor = rgbText(text.background);
      get('accent-preview').style.color = rgbText(accent.foreground);
      get('resolved-colors').replaceChildren();
      for (const [role, label] of roles) {
        const text = rgbText(resolved[role]);
        get('resolved-colors').append(el('dt', `${label} · 混色後`), el('dd', text));
        tokenInputs.get(role)!.color.textContent = text;
      }
      get('contrast-results').replaceChildren(
        el('p', 'WCAG 2.x sRGB contrast · 所選混色情境', 'help'),
        contrastCard('文字 / 底色', text),
        contrastCard('強調 / 底色', accent),
      );
    } catch {
      get('interface-preview').hidden = true;
      get('resolved-colors').replaceChildren();
      get('contrast-results').replaceChildren(
        el('p', '色碼或 alpha 無效；請使用六位 HEX 與 0–1 alpha。沒有可判定的對比。', 'notice'),
      );
      for (const fields of tokenInputs.values()) fields.color.textContent = '輸入無效';
    }
    tokenPreview();
  }
  function extract() {
    if (!decoded || !engine) return;
    report = engine.extractPalette(decoded.pixels, {
      backing: backing(),
      maxSamples: Number(value('samples')),
      maxColors: Number(value('colors')),
    });
    renderEvents.abort();
    renderEvents = new AbortController();
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    canvas.style.backgroundColor = rgbText(report.backing);
    const context = canvas.getContext('2d', { colorSpace: 'srgb' });
    if (!context) throw new Error('Canvas unavailable');
    const image = context.createImageData(decoded.width, decoded.height);
    image.data.set(decoded.pixels);
    context.putImageData(image, 0, 0);
    get('source-meta').textContent =
      `${decoded.width} × ${decoded.height} px · sRGB Canvas · 襯底 ${rgbText(report.backing)}`;
    get('sample-meta').textContent =
      `來源 ${report.pixelCount.toLocaleString('en-US')} pixels ／ 取樣 ${report.sampleCount.toLocaleString('en-US')} ／ 回傳 ${report.colors.length} 個 buckets ／ 省略 ${report.omittedSampleCount.toLocaleString('en-US')} samples。固定 4-bit/channel，頻率不是全圖比例。`;
    const swatches = get('swatches');
    swatches.replaceChildren();
    for (const color of report.colors) {
      const button = el('button', '', 'palette-swatch');
      button.type = 'button';
      button.dataset.hex = color.hex;
      const chip = el('span', '', 'palette-chip');
      chip.style.backgroundColor = rgbText(color.rgb);
      chip.setAttribute('aria-hidden', 'true');
      button.append(
        chip,
        el('strong', color.hex),
        el('span', `${Number((color.frequency * 100).toFixed(2))}% · ${color.count} samples`),
      );
      button.addEventListener(
        'click',
        () => {
          const role = value('assign-role') as Role;
          get<HTMLInputElement>(role).value = color.hex;
          get<HTMLInputElement>(`${role}-alpha`).value = '1';
          updateRoles();
          status.textContent = `已指定 ${color.hex} 給 ${roles.find(([id]) => id === role)![1]}，alpha=1；請自行檢查對比。`;
        },
        { signal: renderEvents.signal },
      );
      swatches.append(button);
    }
    output.hidden = false;
    updateRoles();
  }
  function selectSource(next: typeof source, label: string) {
    invalidateImage();
    source = next;
    fileInput.value = '';
    get('source-name').textContent = label;
    for (const [role] of roles) {
      get<HTMLInputElement>(role).value = defaults[role];
      get<HTMLInputElement>(`${role}-alpha`).value = '1';
    }
    status.textContent = '來源已更新，舊 pixels／色盤／token 已清除，請取樣。';
  }
  fileInput.addEventListener(
    'change',
    () => {
      const files = fileInput.files;
      if (!files?.length) return;
      if (files.length !== 1) {
        selectSource(undefined, '未接受來源。');
        error.textContent = '一次只接受一張圖片；未讀取任何檔案。';
        error.hidden = false;
        return;
      }
      const file = files[0]!;
      selectSource(file, file.name);
    },
    { signal: events.signal },
  );
  for (const [id, kind] of [
    ['demo', 'forest'],
    ['demo-alpha', 'alpha'],
  ] as const)
    get(id).addEventListener(
      'click',
      () =>
        selectSource(
          { kind },
          kind === 'forest'
            ? '人工合成森林色塊 · 240×160 PNG，非照片量測'
            : '人工合成透明色塊 · 240×160 PNG，非照片量測',
        ),
      { signal: events.signal },
    );
  get('run').addEventListener(
    'click',
    () => {
      if (busy) return;
      invalidateImage();
      const token = revision,
        signal = work.signal,
        selected = source;
      try {
        backing();
        if (!selected) throw new Error('請選擇一張本機圖片或載入合成範例。');
      } catch (issue) {
        error.textContent = issue instanceof Error ? issue.message : '請確認輸入。';
        error.hidden = false;
        return;
      }
      busy = true;
      get<HTMLButtonElement>('cancel').disabled = false;
      status.textContent = '正在檢查與解碼本機圖片…';
      void (async () => {
        try {
          const [core, adapter] = await Promise.all([
            import('@sid-tools/core/palette'),
            import('./palette-image'),
          ]);
          if (token !== revision) return;
          const file =
            selected instanceof File ? selected : await makePaletteDemo(selected!.kind, signal);
          if (token !== revision) return;
          const image = await adapter.decodePaletteImage(file, signal);
          if (token !== revision) return;
          engine = core;
          decoded = image;
          extract();
          status.textContent = '取樣完成。指定角色、調整 alpha，再明確選取要下載的 token。';
        } catch (issue) {
          if (token !== revision || signal.aborted) return;
          decoded = undefined;
          report = undefined;
          output.hidden = true;
          error.textContent =
            issue instanceof Error ? issue.message : '圖片處理失敗，沒有產生色盤。';
          error.hidden = false;
          status.textContent = '未完成取樣；可換圖重試。';
        } finally {
          if (token === revision) {
            busy = false;
            get<HTMLButtonElement>('cancel').disabled = true;
          }
        }
      })();
    },
    { signal: events.signal },
  );
  get('cancel').addEventListener(
    'click',
    () => {
      invalidateImage();
      status.textContent = '已取消，舊讀取不會恢復圖片或色盤。';
    },
    { signal: events.signal },
  );
  function adjustExtraction() {
    revoke();
    get('custom-backing-wrap').hidden = value('backing') !== 'custom';
    if (busy) {
      invalidateImage();
      status.textContent = '條件已更新，已取消舊讀取；請重新取樣。';
      return;
    }
    if (!decoded) return;
    try {
      error.hidden = true;
      extract();
      status.textContent = '已依新條件重新取樣；角色保留明確 RGB，沒有自動綁定 bucket。';
    } catch {
      report = undefined;
      output.hidden = true;
      clearTokens();
      error.textContent = '請選擇有效襯底及取樣條件，再按取樣。';
      error.hidden = false;
    }
  }
  for (const id of ['backing', 'custom-backing', 'samples', 'colors'])
    get(id).addEventListener(id === 'custom-backing' ? 'input' : 'change', adjustExtraction, {
      signal: events.signal,
    });
  for (const [role] of roles)
    for (const id of [role, `${role}-alpha`])
      get(id).addEventListener('input', updateRoles, { signal: events.signal });
  get('reference').addEventListener(
    'click',
    () => {
      for (const [role] of roles) {
        get<HTMLInputElement>(role).value = role === 'background' ? '#ffffff' : '#000000';
        get<HTMLInputElement>(`${role}-alpha`).value = '1';
      }
      updateRoles();
      status.textContent = '黑／白參考：兩組皆 21:1；不代表整站無障礙合格。';
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      invalidateImage();
      source = undefined;
      fileInput.value = '';
      get('source-name').textContent = '圖片、pixels、角色選取與 token 已清除。';
      get<HTMLSelectElement>('backing').value = '';
      get('custom-backing-wrap').hidden = true;
      get<HTMLInputElement>('custom-backing').value = '#ffffff';
      get<HTMLSelectElement>('samples').value = '10000';
      get<HTMLSelectElement>('colors').value = '8';
      get<HTMLSelectElement>('assign-role').value = 'foreground';
      for (const [role] of roles) {
        get<HTMLInputElement>(role).value = defaults[role];
        get<HTMLInputElement>(`${role}-alpha`).value = '1';
      }
      status.textContent = '已清除；襯底回到未選，沒有保存來源或結果。';
    },
    { signal: events.signal },
  );
  get('export').addEventListener(
    'click',
    () => {
      if (!css) return;
      revoke();
      downloadUrl = URL.createObjectURL(new Blob([css], { type: 'text/css;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'selected-color-tokens.css';
      link.click();
      status.textContent = '已下載明確選取的 opaque CSS tokens；不含圖片／檔名，亦非無障礙證明。';
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidateImage();
    renderEvents.abort();
    source = undefined;
    fileInput.value = '';
    get('source-name').textContent = '';
    engine = undefined;
  };
}
