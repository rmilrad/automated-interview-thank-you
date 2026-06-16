import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { company?: string; role?: string };
  const company = body.company?.trim();
  if (!company) return NextResponse.json({ error: 'company is required' }, { status: 400 });
  const role = body.role?.trim() || null;
  const rows = (await sql`
    insert into processes (company, role) values (${company}, ${role}) returning id, company, role, status
  `) as { id: number }[];
  return NextResponse.json({ ok: true, id: rows[0].id });
}
