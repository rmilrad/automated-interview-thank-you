import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/google';

type OutboxRow = {
  id: number;
  to_emails: string[];
  subject: string;
  body_html: string;
  body_text: string;
};

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const rows = (await sql`select id, to_emails, subject, body_html, body_text from outbox where id = ${id} and status = 'pending'`) as OutboxRow[];
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const o = rows[0];
  try {
    const messageId = await sendEmail({
      to: o.to_emails,
      bcc: [process.env.GOOGLE_USER_EMAIL!],
      subject: o.subject,
      html: o.body_html,
      text: o.body_text,
      fromName: process.env.SENDER_NAME ?? 'Ryan Milrad',
    });
    await sql`update outbox set status = 'sent', gmail_message_id = ${messageId}, sent_at = now() where id = ${id}`;
    return NextResponse.json({ ok: true, messageId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'send failed' }, { status: 500 });
  }
}
