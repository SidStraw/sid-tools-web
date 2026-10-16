import { scan } from './scanner';
import { failed, type Options } from './model';
import { PROTOCOL } from './protocol';

process.once('message', async (message: { protocol: string; identity: string; input: Options }) => {
  if (message.protocol !== PROTOCOL || typeof message.identity !== 'string') {
    process.exitCode = 2;
    process.disconnect();
    return;
  }
  let report;
  try {
    report = await scan(message.input);
  } catch {
    report = failed('scan-failed');
  }
  process.send?.(JSON.stringify({ protocol: PROTOCOL, identity: message.identity, report }), () => {
    process.disconnect();
  });
});
