import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';

// Delete a process. Threads and events that reference it are detached (their
// process_id is nulled) rather than deleted, so the underlying calendar/email
// records survive and can be re-linked on the next sync.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await sql`update threads set process_id = null where process_id = ${id}`;
  await sql`update events set process_id = null where process_id = ${id}`;
  const rows = (await sql`delete from processes where id = ${id} returning id`) as { id: number }[];
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
