import { parseDockerReport, compareDockerReports } from '@sid-tools/core/dockerfile-review';
self.onmessage = (event: MessageEvent<{ current: string; previous: string | null }>) => {
  void Promise.all([
    parseDockerReport(event.data.current),
    event.data.previous ? parseDockerReport(event.data.previous) : undefined,
  ])
    .then(([report, previous]) =>
      self.postMessage({ ok: true, report, comparison: compareDockerReports(report, previous) }),
    )
    .catch(() => self.postMessage({ ok: false }));
};
