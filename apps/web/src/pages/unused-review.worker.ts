import {
  parseUnusedReport,
  parseUnusedBaseline,
  reviewUnused,
} from '@sid-tools/core/unused-review';
self.onmessage = (event: MessageEvent<{ report: string; baseline: string | null }>) => {
  try {
    const report = parseUnusedReport(event.data.report);
    const baseline = event.data.baseline ? parseUnusedBaseline(event.data.baseline) : null;
    self.postMessage({ ok: true, report, review: reviewUnused(report, baseline) });
  } catch {
    self.postMessage({ ok: false });
  }
};
