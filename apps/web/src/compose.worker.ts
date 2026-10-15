import { analyzeCompose } from '@sid-tools/core/compose';
self.onmessage = (event: MessageEvent<unknown>) => {
  const value = event.data;
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('kind' in value) ||
    value.kind !== 'analyze' ||
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    !('source' in value) ||
    typeof value.source !== 'string' ||
    Object.keys(value).some((key) => !['kind', 'id', 'source'].includes(key))
  )
    return;
  try {
    self.postMessage({ kind: 'report', id: value.id, report: analyzeCompose(value.source) });
  } catch {
    self.postMessage({ kind: 'failure', id: value.id });
  }
};
