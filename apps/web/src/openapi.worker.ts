import { compareOpenApi } from '@sid-tools/core/openapi';

// Dedicated per-run module worker. No shared tools-worker or main-thread fallback.
self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (
    typeof data !== 'object' ||
    data === null ||
    !('kind' in data) ||
    data.kind !== 'compare' ||
    !('id' in data) ||
    !Number.isSafeInteger(data.id) ||
    !('before' in data) ||
    typeof data.before !== 'string' ||
    !('after' in data) ||
    typeof data.after !== 'string'
  )
    return;
  try {
    self.postMessage({
      kind: 'result',
      id: data.id,
      report: compareOpenApi(data.before, data.after),
    });
  } catch {
    self.postMessage({ kind: 'failure', id: data.id });
  }
};
