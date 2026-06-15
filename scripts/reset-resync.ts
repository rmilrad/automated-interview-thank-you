import './load-env';
import { sql } from '../src/lib/db';
import { runSync } from '../src/lib/sync';

async function main() {
  await sql`truncate outbox, cards, events, threads, processes restart identity cascade`;
  console.log('Cleared processes/threads/events/cards/outbox.');
  const res = await runSync();
  console.log('Sync done:', res);
  const procs = (await sql`select id, company, role from processes order by company`) as { id: number; company: string; role: string | null }[];
  console.log(`\n${procs.length} processes:`);
  for (const p of procs) console.log(`  ${p.id}  ${p.company}${p.role ? ' · ' + p.role : ''}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
