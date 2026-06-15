import { initDb, sql } from './db';
import { listEvents, searchMessages, type CalEvent } from './google';
import { classifyEmail, draftThankYou } from './anthropic';
import { randomSlug, cardPassword } from './util';

const DAY = 86_400_000;
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
  'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'aol.com',
]);

function parseEmailAddr(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

function parseDate(d: string): string | null {
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function companyFromEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || GENERIC_DOMAINS.has(domain)) return null;
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function companyFromAttendees(attendees: { email: string; name?: string }[]): string | null {
  for (const a of attendees) {
    const c = companyFromEmail(a.email);
    if (c) return c;
  }
  return null;
}

const INTERVIEW_TITLE = /\b(interview|phone screen|screen|onsite|on-site|recruit|hiring|chat|intro|introductory|catch up|catch-up|sync|coffee|next steps|debrief|panel|hr|technical|loop)\b/i;

// An event counts as interview-related if we can tie it to a company (external
// company-domain attendee) or its title looks like a hiring conversation.
// Filters out personal calendar noise (mortgage reminders, etc.).
function isInterviewEvent(company: string | null, title: string): boolean {
  return !!company || INTERVIEW_TITLE.test(title);
}

async function upsertProcess(company: string, role: string | null): Promise<number> {
  const existing = (await sql`select id from processes where lower(company) = lower(${company}) limit 1`) as { id: number }[];
  if (existing.length) {
    await sql`update processes set updated_at = now() where id = ${existing[0].id}`;
    return existing[0].id;
  }
  const ins = (await sql`insert into processes (company, role) values (${company}, ${role}) returning id`) as { id: number }[];
  return ins[0].id;
}

export async function runSync() {
  await initDb();
  const now = new Date();
  const events = await listEvents(new Date(now.getTime() - 30 * DAY), new Date(now.getTime() + 30 * DAY));
  const query =
    'newer_than:60d (interview OR recruiter OR "phone screen" OR onsite OR hiring OR "next steps" OR "your application" OR "schedule a call")';
  const msgs = await searchMessages(query, 60);

  let threadCount = 0;
  for (const m of msgs) {
    const exists = (await sql`select id from threads where gmail_thread_id = ${m.threadId}`) as { id: number }[];
    if (exists.length) continue;
    const c = await classifyEmail(m.subject, m.from, m.snippet);
    if (!c.isInterview && c.confidence > 0.6) continue;
    const processId = c.company ? await upsertProcess(c.company, c.role) : null;
    await sql`
      insert into threads (gmail_thread_id, process_id, contact_email, subject, last_message_at, confidence, needs_review, is_interview)
      values (${m.threadId}, ${processId}, ${parseEmailAddr(m.from)}, ${m.subject}, ${parseDate(m.date)}, ${c.confidence}, ${c.confidence < 0.6}, ${c.isInterview})
      on conflict (gmail_thread_id) do nothing`;
    threadCount++;
  }

  let eventCount = 0;
  for (const e of events) {
    if (!e.attendees.length) continue;
    const company = companyFromAttendees(e.attendees);
    if (!isInterviewEvent(company, e.title)) continue;
    const processId = company ? await upsertProcess(company, null) : null;
    await sql`
      insert into events (gcal_event_id, process_id, title, start_at, end_at, attendees, company)
      values (${e.id}, ${processId}, ${e.title}, ${e.start}, ${e.end}, ${JSON.stringify(e.attendees)}, ${company})
      on conflict (gcal_event_id) do update set title = excluded.title, start_at = excluded.start_at, attendees = excluded.attendees, company = excluded.company`;
    eventCount++;
  }

  await sql`insert into sync_state (id, last_run_at) values (1, now()) on conflict (id) do update set last_run_at = now()`;
  return { threads: threadCount, events: eventCount };
}

function emailText(text: string, link: string, password: string, sender: string): string {
  return `${text}

I made you a quick digital thank-you card — you can open it anytime here:
${link}
Password: ${password}

— ${sender}

(This note was prepared and sent automatically on ${sender}'s behalf after our interview. The card lives on a small personal site ${sender} built.)`;
}

function emailHtml(text: string, link: string, password: string, sender: string): string {
  const paras = text.split('\n').filter(Boolean).map((p) => `<p style="margin:0 0 14px">${p}</p>`).join('');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:520px">
  ${paras}
  <div style="margin:22px 0;padding:16px;border:1px solid #eee;border-radius:12px;background:#fafafa">
    <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open your thank-you card</a>
    <p style="margin:12px 0 0;font-size:13px;color:#666">Password: <strong>${password}</strong></p>
  </div>
  <p style="margin:0;font-weight:600">— ${sender}</p>
  <p style="margin:14px 0 0;font-size:12px;color:#999">This note was prepared and sent automatically on ${sender}'s behalf after our interview.</p>
</div>`;
}

// Prepares thank-you cards + queued emails for interviews on a given day. Never sends.
export async function prepareThankYous(forDate: Date, senderName: string) {
  await initDb();
  const dayStart = new Date(forDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(forDate); dayEnd.setHours(23, 59, 59, 999);
  const events = (await sql`
    select * from events
    where start_at >= ${dayStart.toISOString()} and start_at <= ${dayEnd.toISOString()}
  `) as Array<{ id: number; title: string; company: string | null; attendees: { email: string; name?: string }[] }>;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  let created = 0;
  for (const e of events) {
    const already = (await sql`select id from outbox where event_id = ${e.id}`) as { id: number }[];
    if (already.length) continue;
    const attendees = e.attendees ?? [];
    if (!attendees.length) continue;

    const company = e.company ?? 'the team';
    const recipientName = attendees[0]?.name ?? null;
    const draft = await draftThankYou({ company, role: null, recipientName, interviewTitle: e.title, senderName });

    const slug = randomSlug();
    const password = cardPassword(company);
    const card = (await sql`
      insert into cards (slug, event_id, company, recipient_name, message, password)
      values (${slug}, ${e.id}, ${company}, ${recipientName}, ${draft.cardMessage}, ${password})
      returning id`) as { id: number }[];

    const link = `${baseUrl}/card/${slug}`;
    await sql`
      insert into outbox (card_id, event_id, to_emails, subject, body_html, body_text, status)
      values (${card[0].id}, ${e.id}, ${JSON.stringify(attendees.map((a) => a.email))}, ${draft.emailSubject},
              ${emailHtml(draft.emailText, link, password, senderName)}, ${emailText(draft.emailText, link, password, senderName)}, 'pending')`;
    created++;
  }
  return { cards: created };
}
