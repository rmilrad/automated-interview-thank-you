import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';

// Resolve a low-confidence thread flagged for review.
//   keep    -> confirm it's interview-related; clear the review flag
//   dismiss -> it isn't an interview; remove the thread entirely
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action === 'keep') {
    const rows = (await sql`update threads set needs_review = false where id = ${id} returning id`) as { id: number }[];
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'dismiss') {
    const rows = (await sql`delete from threads where id = ${id} returning id`) as { id: number }[];
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}
