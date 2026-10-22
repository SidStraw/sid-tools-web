import Router from 'find-my-way';
import type { MockContract, MockState } from '@sid-tools/core/mock-runtime';
export function createMockResponder(contract: MockContract) {
  const router = Router({
    caseSensitive: true,
    ignoreTrailingSlash: false,
    ignoreDuplicateSlashes: false,
    maxParamLength: 1024,
  });
  for (const operation of new Set(contract.choices.map((c) => c.operation))) {
    const c = contract.choices.find((choice) => choice.operation === operation)!;
    router.on(
      c.method as Router.HTTPMethod,
      c.path.replace(/\{([^}]+)\}/g, ':$1'),
      () => {},
      operation,
    );
  }
  return (state: MockState, method: string, path: string) => {
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method))
      return {
        status: 405,
        body: JSON.stringify({ error: 'method-unsupported' }),
        delayMs: 0,
        headers: {},
      };
    const found = router.find(method as Router.HTTPMethod, path),
      operation: unknown = found?.store;
    const setting =
      typeof operation === 'string'
        ? state.settings.find((s) => s.operation === operation)
        : undefined;
    if (!setting)
      return {
        status: 404,
        body: JSON.stringify({ error: 'mock-route-not-found' }),
        delayMs: 0,
        headers: {},
      };
    const selected = contract.choices.find((c) => c.id === setting.choice)!;
    return {
      status: Number(selected.status),
      body: selected.fixtureJson,
      delayMs: setting.delayMs,
      headers: {
        'content-type': selected.mediaType,
        'x-sidtools-scenario': selected.id,
        'x-sidtools-revision': String(state.revision),
      },
    };
  };
}
