import { sql } from './db';

export type Process = {
  id: number;
  company: string;
  role: string | null;
  status: string;
  stage: string | null;
  notes: string | null;
  updated_at: string;
};

export type Thread = {
  id: number;
  process_id: number | null;
  contact_email: string | null;
  subject: string | null;
  summary: string | null;
  last_message_at: string | null;
  confidence: number | null;
  needs_review: boolean;
};

export type OutboxItem = {
  id: number;
  card_id: number | null;
  event_id: number | null;
  to_emails: string[];
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  status: string;
  created_at: string;
  card_slug?: string | null;
  card_password?: string | null;
  card_company?: string | null;
};

export type EventRow = {
  id: number;
  process_id: number | null;
  title: string | null;
  start_at: string | null;
  end_at: string | null;
  attendees: { email: string; name?: string }[] | null;
  company: string | null;
};

export async function getProcesses(): Promise<Process[]> {
  return (await sql`
    select id, company, role, status, stage, notes, updated_at
    from processes order by updated_at desc
  `) as Process[];
}

export async function getProcessById(id: number): Promise<Process | null> {
  const r = (await sql`
    select id, company, role, status, stage, notes, updated_at
    from processes where id = ${id} limit 1
  `) as Process[];
  return r[0] ?? null;
}

export async function getEventsForProcess(processId: number): Promise<EventRow[]> {
  return (await sql`
    select id, process_id, title, start_at, end_at, attendees, company
    from events where process_id = ${processId} order by start_at desc nulls last
  `) as EventRow[];
}

export async function getThreadsForProcess(processId: number): Promise<Thread[]> {
  return (await sql`
    select id, process_id, contact_email, subject, summary, last_message_at, confidence, needs_review
    from threads where process_id = ${processId} order by last_message_at desc nulls last
  `) as Thread[];
}

export async function getThreadsNeedingReview(): Promise<Thread[]> {
  return (await sql`
    select id, process_id, contact_email, subject, summary, last_message_at, confidence, needs_review
    from threads where needs_review = true order by last_message_at desc nulls last
  `) as Thread[];
}

export async function getPendingOutbox(): Promise<OutboxItem[]> {
  return (await sql`
    select o.id, o.card_id, o.event_id, o.to_emails, o.subject, o.body_html, o.body_text,
           o.status, o.created_at, c.slug as card_slug, c.password as card_password, c.company as card_company
    from outbox o
    left join cards c on c.id = o.card_id
    where o.status = 'pending'
    order by o.created_at desc
  `) as OutboxItem[];
}
