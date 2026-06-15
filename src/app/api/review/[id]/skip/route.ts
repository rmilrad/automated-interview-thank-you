import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await sql`update outbox set status = 'skipped' where id = ${id} and status = 'pending'`;
  return NextResponse.json({ ok: true });
}
