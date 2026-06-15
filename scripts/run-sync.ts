import './load-env';
import { runSync } from '../src/lib/sync';

async function main() {
  const r = await runSync();
  console.log('SYNC_RESULT ' + JSON.stringify(r));
}

main().catch((e) => {
  console.error('SYNC_ERROR', e);
  process.exit(1);
});
