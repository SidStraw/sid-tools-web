self.onmessage = async (event: MessageEvent<{ tool: string; args: string[] }>) => {
  try {
    const [a = '', b = '', c = '', d = ''] = event.data.args;
    if (event.data.tool === 'json-diff') {
      const { compareJson, serializeJson } = await import('@sid-tools/core/json-diff');
      const result = compareJson(a, b, c, d);
      const view = {
        ...result,
        changes: result.changes.map((row) => ({
          ...row,
          before: Object.hasOwn(row, 'before') ? serializeJson(row.before) : '（不存在）',
          after: Object.hasOwn(row, 'after') ? serializeJson(row.after) : '（不存在）',
        })),
      };
      self.postMessage({ ok: true, json: serializeJson(result), view: JSON.stringify(view) });
    } else {
      const result =
        event.data.tool === 'lighthouse'
          ? (await import('@sid-tools/core/lighthouse')).compareLighthouse(a, b)
          : (await import('@sid-tools/core/cron')).previewCron(a, b, c, d);
      const json = JSON.stringify(result, null, 2);
      self.postMessage({ ok: true, json, view: json });
    }
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
