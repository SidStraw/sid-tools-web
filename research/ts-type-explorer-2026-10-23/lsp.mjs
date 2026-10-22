import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
export async function startLsp(root) {
  const child = spawn(
    process.execPath,
    [resolve('node_modules/typescript/bin/tsc'), '--lsp', '--stdio'],
    { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  let buffer = Buffer.alloc(0),
    seq = 0;
  const pending = new Map();
  let stderr = '';
  const send = (m) => {
    const body = JSON.stringify({ jsonrpc: '2.0', ...m });
    child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  };
  child.stderr.on('data', (b) => {
    stderr += b;
  });
  child.stdout.on('data', (b) => {
    buffer = Buffer.concat([buffer, b]);
    while (true) {
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) break;
      const n = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, end).toString())?.[1]);
      if (!Number.isFinite(n)) throw Error('invalid header');
      if (buffer.length < end + 4 + n) break;
      const msg = JSON.parse(buffer.subarray(end + 4, end + 4 + n));
      buffer = buffer.subarray(end + 4 + n);
      if (msg.method && msg.id !== undefined) {
        send({
          id: msg.id,
          result:
            msg.method === 'workspace/configuration' ? msg.params.items.map(() => null) : null,
        });
      } else if (msg.id !== undefined) {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          clearTimeout(p.timer);
          msg.error ? p.reject(Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
        }
      }
    }
  });
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error(`LSP timeout: ${method}`));
      }, 30000);
      pending.set(id, { resolve, reject, timer });
      send({ id, method, params });
    });
  child.on('exit', (code) => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(Error(`LSP exit ${code}: ${stderr.slice(0, 400)}`));
    }
    pending.clear();
  });
  const initialization = await request('initialize', {
    processId: process.pid,
    rootUri: pathToFileURL(root).href,
    capabilities: {
      textDocument: { hover: { contentFormat: ['markdown'] } },
      experimental: { hoverVerbosityLevel: true },
    },
  });
  send({ method: 'initialized', params: {} });
  return {
    initialization,
    notify: (method, params) => send({ method, params }),
    request,
    async close() {
      try {
        await request('shutdown', undefined);
        send({ method: 'exit' });
      } finally {
        child.kill();
      }
    },
  };
}
