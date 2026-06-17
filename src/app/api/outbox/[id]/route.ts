import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { sql } from '@/lib/db';

// Edit a pending thank-you email before it's approved/sent. We store the
// edited subject + plain-text body verbatim and regenerate the HTML body from
// that text so the two stay in sync (links stay clickable, paragraphs wrap).
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function linkify(s: string): string {
  return s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" style="color:#111">$1</a>');
}

function htmlFromText(text: string): string {
  const paras = text
    .split('\n')
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p style="margin:0 0 14px">${linkify(escapeHtml(p))}</p>`)
    .join('');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:520px">${paras}</div>`;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { subject?: string; body_text?: string };

  const subject = typeof body.subject === 'string' ? body.subject.trim() : undefined;
  const bodyText = typeof body.body_text === 'string' ? body.body_text : undefined;

  if (subject === undefined && bodyText === undefined) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }
  if (subject !== undefined && subject.length === 0) {
    return NextResponse.json({ error: 'subject cannot be empty' }, { status: 400 });
  }
  if (bodyText !== undefined && bodyText.trim().length === 0) {
    return NextResponse.json({ error: 'message cannot be empty' }, { status: 400 });
  }

  const bodyHtml = bodyText !== undefined ? htmlFromText(bodyText) : undefined;

  const rows = (await sql`
    update outbox set
      subject = coalesce(${subject ?? null}, subject),
      body_text = coalesce(${bodyText ?? null}, body_text),
      body_html = coalesce(${bodyHtml ?? null}, body_html)
    where id = ${id} and status = 'pending'
    returning id, subject, body_text, body_html
  `) as { id: number; subject: string; body_text: string; body_html: string }[];

  if (!rows.length) {
    return NextResponse.json({ error: 'not found or already sent' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: rows[0] });
}
