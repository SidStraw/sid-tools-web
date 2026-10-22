import { compareBundles, parseBundleReport, type ByteMetric } from '@sid-tools/core/bundle-diff';
self.onmessage = (
  event: MessageEvent<{
    before: string;
    after: string;
    budget: { metric: ByteMetric; limit: number } | null;
  }>,
) => {
  try {
    self.postMessage({
      ok: true,
      result: compareBundles(
        parseBundleReport(event.data.before),
        parseBundleReport(event.data.after),
        event.data.budget,
      ),
    });
  } catch {
    self.postMessage({ ok: false });
  }
};
