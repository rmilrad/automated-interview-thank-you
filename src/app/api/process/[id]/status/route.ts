import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';

const ALLOWED = new Set(['active', 'rejected']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }
  const rows = (await sql`
    update processes set status = ${body.status}, updated_at = now()
    where id = ${id} returning id, status
  `) as { id: number; status: string }[];
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, status: rows[0].status });
}
