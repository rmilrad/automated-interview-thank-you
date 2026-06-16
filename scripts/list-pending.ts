import './load-env';
import { sql } from '../src/lib/db';

async function main() {
  const rows = (await sql`select id, subject, to_emails, body_text, created_at from outbox where status='pending' order by created_at`) as Array<{ id: number; subject: string; to_emails: string[]; body_text: string }>;
  console.log('pending:', rows.length);
  for (const r of rows) {
    console.log(`\n--- id=${r.id} | ${r.subject} | to=${JSON.stringify(r.to_emails)}`);
    console.log(r.body_text);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
