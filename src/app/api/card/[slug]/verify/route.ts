import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type CardRow = {
  company: string;
  recipient_name: string | null;
  message: string;
  password: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { password } = await req.json().catch(() => ({ password: '' }));
  const rows = (await sql`select company, recipient_name, message, password from cards where slug = ${slug}`) as CardRow[];
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!password || password !== rows[0].password) {
    return NextResponse.json({ error: 'wrong password' }, { status: 401 });
  }
  return NextResponse.json({
    company: rows[0].company,
    recipientName: rows[0].recipient_name,
    message: rows[0].message,
  });
}
