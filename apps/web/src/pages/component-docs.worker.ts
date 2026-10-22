import {
  parsePropsReport,
  parsePropsDocument,
  proposePropsDocument,
  reviewProps,
} from '@sid-tools/core/component-docs';
self.onmessage = (event: MessageEvent<{ report: string; document: string | null }>) => {
  try {
    const report = parsePropsReport(event.data.report),
      doc = event.data.document ? parsePropsDocument(event.data.document) : null;
    const review = reviewProps(report, doc),
      proposal = report.complete ? proposePropsDocument(report, doc) : null;
    self.postMessage({ ok: true, report, review, proposal });
  } catch {
    self.postMessage({ ok: false });
  }
};
