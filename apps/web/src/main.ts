import {
  formatBytes,
  LIMITS,
  outputName,
  validateOptions,
  type BudgetOptions,
} from '@sid-tools/core';
import { zip } from 'fflate';
import type { ImageResult, ProcessResponse } from './types';
import './style.css';

function element<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
}
const input = element<HTMLInputElement>('#file-input');
const form = element<HTMLFormElement>('#settings-form');
const fields = element<HTMLFieldSetElement>('#settings-fields');
const start = element<HTMLButtonElement>('#start');
const cancel = element<HTMLButtonElement>('#cancel');
const clear = element<HTMLButtonElement>('#clear');
const downloadAll = element<HTMLButtonElement>('#download-all');
const list = element<HTMLUListElement>('#results');
const notice = element<HTMLParagraphElement>('#notice');
const progress = element<HTMLParagraphElement>('#progress');
const preview = element<HTMLDialogElement>('#preview');
interface Item {
  file: File;
  status: 'waiting' | 'running' | 'complete' | 'error' | 'cancelled';
  result?: ImageResult;
  error?: string;
  url?: string;
  originalUrl?: string;
  budget?: number;
}
let items: Item[] = [];
let busy = false;
let generation = 0;
let abortCurrent: (() => void) | undefined;
let exporting = false;
let abortZip: (() => void) | undefined;

function showNotice(message: string) {
  notice.textContent = message;
  notice.hidden = !message;
}
function setText(selector: string, text: string) {
  element(selector).textContent = text;
}
function getOptions(): BudgetOptions {
  const options: BudgetOptions = {
    maxBytes:
      Number(element<HTMLInputElement>('#budget').value) *
      Number(element<HTMLSelectElement>('#unit').value),
    maxWidth: Number(element<HTMLInputElement>('#max-width').value),
    maxHeight: Number(element<HTMLInputElement>('#max-height').value),
    format: element<HTMLSelectElement>('#format').value as BudgetOptions['format'],
    flatten: element<HTMLInputElement>('#flatten').checked,
  };
  validateOptions(options);
  return options;
}
function byteHint() {
  const amount = Number(element<HTMLInputElement>('#budget').value),
    unit = element<HTMLSelectElement>('#unit');
  setText(
    '#byte-hint',
    `${amount} ${unit.selectedOptions[0]?.textContent ?? 'KB'} = ${(amount * Number(unit.value)).toLocaleString('en-US')} bytes`,
  );
}
form.addEventListener('input', byteHint);
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
function compare(item: Item) {
  if (!item.result || !item.url) return;
  item.originalUrl ??= URL.createObjectURL(item.file);
  element<HTMLImageElement>('#original-preview').src = item.originalUrl;
  element<HTMLImageElement>('#output-preview').src = item.url;
  setText('#preview-title', item.file.name);
  setText(
    '#original-caption',
    `原圖 · ${item.result.originalWidth} × ${item.result.originalHeight} · ${formatBytes(item.file.size)}`,
  );
  setText(
    '#output-caption',
    `輸出 · ${item.result.width} × ${item.result.height} · ${formatBytes(item.result.blob.size)}`,
  );
  preview.showModal();
}
element('#close-preview').addEventListener('click', () => preview.close());
preview.addEventListener('click', (event) => {
  if (event.target === preview) preview.close();
});
function release(item: Item) {
  if (item.url) URL.revokeObjectURL(item.url);
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  delete item.url;
  delete item.originalUrl;
}
function render() {
  list.replaceChildren();
  let completed = 0,
    outputs = 0,
    passed = 0;
  items.forEach((item, index) => {
    if (item.status === 'complete' || item.status === 'error' || item.status === 'cancelled')
      completed++;
    if (item.result) {
      outputs++;
      if (item.result.withinBudget) passed++;
    }
    const row = document.createElement('li');
    row.className = 'result-row';
    const head = document.createElement('div');
    head.className = 'result-head';
    const thumb = document.createElement('div');
    thumb.className = 'result-thumb checker';
    if (item.url) {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = '';
      thumb.append(img);
    } else thumb.textContent = String(index + 1).padStart(2, '0');
    const info = document.createElement('div');
    info.className = 'result-info';
    const name = document.createElement('h4');
    name.textContent = item.file.name;
    info.append(name);
    const size = document.createElement('p');
    size.textContent = item.result
      ? `${formatBytes(item.file.size)} → ${formatBytes(item.result.blob.size)} · ${item.result.width} × ${item.result.height} · ${item.result.format.replace('image/', '').toUpperCase()}`
      : `${formatBytes(item.file.size)} · 等待處理後檢查格式與尺寸`;
    info.append(size);
    const badge = document.createElement('span');
    badge.className = `status ${item.status}`;
    const labels = {
      waiting: '等待處理',
      running: '處理中',
      error: '無法處理',
      cancelled: '已取消',
      complete: item.result?.withinBudget ? '符合預算' : '超出預算',
    };
    badge.textContent = labels[item.status];
    if (item.result && !item.result.withinBudget) badge.classList.add('over-budget');
    head.append(thumb, info, badge);
    row.append(head);
    if (item.error) {
      const message = document.createElement('p');
      message.className = 'result-error';
      message.textContent = item.error;
      row.append(message);
    }
    const result = item.result;
    if (result) {
      const detail = document.createElement('div');
      detail.className = 'result-detail';
      const bytes = document.createElement('p');
      bytes.className = 'exact-bytes';
      bytes.textContent = `${result.blob.size.toLocaleString('en-US')} / ${item.budget?.toLocaleString('en-US')} bytes · 尺寸與格式符合設定`;
      detail.append(bytes);
      for (const note of result.notes) {
        const paragraph = document.createElement('p');
        paragraph.textContent = note;
        detail.append(paragraph);
      }
      const actions = document.createElement('div');
      actions.className = 'result-actions';
      const view = document.createElement('button');
      view.textContent = '比較前後';
      view.className = 'text-button';
      view.addEventListener('click', () => compare(item));
      const save = document.createElement('button');
      save.textContent = result.withinBudget ? '下載 ↓' : '下載未達標結果 ↓';
      save.className = 'text-button';
      save.addEventListener('click', () =>
        download(result.blob, outputName(item.file.name, result.format, index)),
      );
      actions.append(view, save);
      detail.append(actions);
      row.append(detail);
    }
    list.append(row);
  });
  setText(
    '#file-count',
    items.length
      ? `${items.length} 張 · ${formatBytes(items.reduce((sum, i) => sum + i.file.size, 0))}`
      : '還沒有圖片',
  );
  setText('#result-count', String(items.length));
  element('#empty-state').hidden = items.length > 0;
  element('#batch-footer').hidden = items.length === 0;
  progress.textContent = busy
    ? `處理進度 ${completed} / ${items.length}`
    : `${outputs} 張有結果 · ${passed} 張符合預算${outputs > passed ? ' · ZIP 包含未達標結果' : ''}`;
  start.disabled = busy || !items.length || exporting;
  start.innerHTML = outputs
    ? '重新處理 <span aria-hidden="true">↻</span>'
    : '開始處理 <span aria-hidden="true">→</span>';
  start.hidden = busy;
  cancel.hidden = !busy;
  fields.disabled = busy;
  input.disabled = busy || exporting;
  clear.disabled = !items.length;
  downloadAll.disabled = busy || !outputs || exporting;
  downloadAll.textContent = exporting ? '正在打包…' : '下載全部 ZIP ↓';
}
function addFiles(files: File[]) {
  if (busy || exporting) return;
  if (items.length + files.length > LIMITS.files) {
    showNotice('每批最多 30 張圖片，請減少檔案或先清除這批。');
    return;
  }
  if (files.some((file) => file.size > LIMITS.fileBytes)) {
    showNotice('單檔不可超過 20 MB；這次選取未加入，請重新選擇。');
    return;
  }
  if (
    files.reduce(
      (sum, file) => sum + file.size,
      items.reduce((sum, i) => sum + i.file.size, 0),
    ) > LIMITS.batchBytes
  ) {
    showNotice('整批原圖不可超過 100 MB；這次選取未加入。');
    return;
  }
  showNotice('');
  items.push(...files.map((file) => ({ file, status: 'waiting' as const })));
  render();
}
input.addEventListener('change', () => {
  addFiles(Array.from(input.files ?? []));
  input.value = '';
});
const dropZone = element('#drop-zone');
for (const name of ['dragenter', 'dragover'])
  dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
for (const name of ['dragleave', 'drop'])
  dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
  });
dropZone.addEventListener('drop', (event) => {
  if (event instanceof DragEvent) addFiles(Array.from(event.dataTransfer?.files ?? []));
});
function run(file: File, options: BudgetOptions): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => {
      worker.terminate();
      clearTimeout(timeout);
      abortCurrent = undefined;
    };
    const timeout = setTimeout(() => {
      finish();
      reject(new Error('處理超過 60 秒，已停止。請縮小原圖或改用較小檔案。'));
    }, 60_000);
    abortCurrent = () => {
      finish();
      reject(new DOMException('已取消', 'AbortError'));
    };
    worker.onmessage = (event: MessageEvent<ProcessResponse>) => {
      finish();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = () => {
      finish();
      reject(new Error('瀏覽器無法完成處理，請確認支援 Worker 與 OffscreenCanvas。'));
    };
    worker.postMessage({ file, options });
  });
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy || exporting || !items.length) return;
  let options: BudgetOptions;
  try {
    options = getOptions();
  } catch (error) {
    showNotice(error instanceof Error ? error.message : '設定有誤');
    return;
  }
  showNotice('');
  busy = true;
  const token = ++generation;
  items.forEach((item) => {
    release(item);
    delete item.result;
    delete item.error;
    item.status = 'waiting';
    item.budget = options.maxBytes;
  });
  render();
  void (async () => {
    let outputBytes = 0;
    for (const item of items) {
      if (token !== generation) break;
      item.status = 'running';
      render();
      try {
        const result = await run(item.file, options);
        if (token !== generation) break;
        if (outputBytes + result.blob.size > LIMITS.batchBytes)
          throw new Error('輸出總量將超過 100 MB，請縮小尺寸或分批處理。');
        outputBytes += result.blob.size;
        item.result = result;
        item.url = URL.createObjectURL(result.blob);
        item.status = 'complete';
      } catch (error) {
        if (token !== generation) break;
        item.status = 'error';
        item.error = error instanceof Error ? error.message : '處理失敗';
      }
      render();
    }
    if (token === generation) {
      busy = false;
      render();
    }
  })();
});
function stop() {
  generation++;
  abortCurrent?.();
  abortZip?.();
  abortZip = undefined;
  exporting = false;
  busy = false;
  items.forEach((item) => {
    if (item.status === 'running' || item.status === 'waiting') item.status = 'cancelled';
  });
}
cancel.addEventListener('click', () => {
  stop();
  render();
  progress.textContent = '已取消。已完成結果仍可下載；可重新處理整批。';
});
clear.addEventListener('click', () => {
  stop();
  preview.close();
  element<HTMLImageElement>('#original-preview').removeAttribute('src');
  element<HTMLImageElement>('#output-preview').removeAttribute('src');
  items.forEach(release);
  items = [];
  input.value = '';
  showNotice('');
  render();
});
downloadAll.addEventListener('click', () => {
  if (busy || exporting) return;
  exporting = true;
  render();
  const token = generation;
  const snapshot = [...items];
  void (async () => {
    try {
      const entries: Record<string, Uint8Array> = {};
      for (const [index, item] of snapshot.entries()) {
        if (token !== generation) return;
        if (item.result)
          entries[outputName(item.file.name, item.result.format, index)] = new Uint8Array(
            await item.result.blob.arrayBuffer(),
          );
      }
      if (token !== generation) return;
      abortZip = zip(entries, { level: 0 }, (error, data) => {
        abortZip = undefined;
        if (token !== generation) return;
        exporting = false;
        if (error) showNotice('ZIP 打包失敗，請改用單檔下載。');
        else
          download(
            new Blob([new Uint8Array(data)], { type: 'application/zip' }),
            'sid-tools-images.zip',
          );
        render();
      });
    } catch {
      if (token === generation) {
        exporting = false;
        showNotice('無法打包，請改用單檔下載。');
        render();
      }
    }
  })();
});
render();
