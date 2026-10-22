import { parseDependencyReport } from '@sid-tools/core/dependency-graph';
self.onmessage = (event: MessageEvent<string>) => {
  try {
    self.postMessage({ ok: true, graph: parseDependencyReport(event.data) });
  } catch {
    self.postMessage({ ok: false, error: '報告格式無效、不支援或超過限制。' });
  }
};
