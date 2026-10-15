import {
  inspectOpenApiFixtures,
  generateOpenApiFixture,
  type OpenApiFixtureOptions,
} from '@sid-tools/core/openapi-fixture';
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function options(value: unknown): value is OpenApiFixtureOptions {
  return (
    object(value) &&
    Object.keys(value).every((key) =>
      [
        'method',
        'path',
        'status',
        'mediaType',
        'exampleName',
        'seed',
        'arrayLength',
        'sourceConfirmedSynthetic',
      ].includes(key),
    ) &&
    ['method', 'path', 'status', 'mediaType'].every((key) => typeof value[key] === 'string') &&
    (typeof value.seed === 'string' ||
      (typeof value.seed === 'number' && Number.isSafeInteger(value.seed))) &&
    typeof value.sourceConfirmedSynthetic === 'boolean' &&
    (value.exampleName === undefined || typeof value.exampleName === 'string') &&
    (value.arrayLength === undefined ||
      (typeof value.arrayLength === 'number' && Number.isFinite(value.arrayLength)))
  );
}
self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (!object(data) || !Number.isSafeInteger(data.id) || typeof data.source !== 'string') return;
  if (
    data.kind === 'inspect' &&
    Object.keys(data).every((key) => ['kind', 'id', 'source'].includes(key))
  ) {
    try {
      self.postMessage({
        kind: 'inspection',
        id: data.id,
        result: inspectOpenApiFixtures(data.source),
      });
    } catch {
      self.postMessage({ kind: 'failure', id: data.id, request: 'inspect' });
    }
  } else if (
    data.kind === 'generate' &&
    Object.keys(data).every((key) => ['kind', 'id', 'source', 'options'].includes(key)) &&
    options(data.options)
  ) {
    try {
      self.postMessage({
        kind: 'generation',
        id: data.id,
        result: generateOpenApiFixture(data.source, data.options),
      });
    } catch {
      self.postMessage({ kind: 'failure', id: data.id, request: 'generate' });
    }
  }
};
