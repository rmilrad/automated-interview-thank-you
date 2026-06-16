import './load-env';
import { sql } from '../src/lib/db';

async function main() {
  const rows = await sql`select slug, password, company, recipient_name from cards order by id desc limit 5`;
  console.log(JSON.stringify(rows, null, 2));
}
main();
