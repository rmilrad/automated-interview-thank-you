import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazily create the client so the app can build/run before DATABASE_URL is set.
let client: NeonQueryFunction<false, false> | null = null;
function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

export const sql = new Proxy((() => {}) as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getClient() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    return c[prop];
  },
});

const STATEMENTS = [
  `create table if not exists processes (
    id serial primary key,
    company text not null,
    role text,
    status text default 'active',
    stage text,
    notes text,
    updated_at timestamptz default now(),
    created_at timestamptz default now()
  )`,
  `create table if not exists contacts (
    id serial primary key,
    email text unique not null,
    name text,
    company text,
    role text,
    process_id int references processes(id),
    created_at timestamptz default now()
  )`,
  `create table if not exists threads (
    id serial primary key,
    gmail_thread_id text unique not null,
    process_id int references processes(id),
    contact_email text,
    subject text,
    summary text,
    last_message_at timestamptz,
    confidence real,
    needs_review boolean default false,
    is_interview boolean default true,
    created_at timestamptz default now()
  )`,
  `create table if not exists events (
    id serial primary key,
    gcal_event_id text unique not null,
    process_id int references processes(id),
    title text,
    start_at timestamptz,
    end_at timestamptz,
    attendees jsonb,
    company text,
    created_at timestamptz default now()
  )`,
  `create table if not exists cards (
    id serial primary key,
    slug text unique not null,
    event_id int references events(id),
    company text,
    recipient_name text,
    message text,
    password text not null,
    logo_url text,
    created_at timestamptz default now()
  )`,
  `create table if not exists outbox (
    id serial primary key,
    card_id int references cards(id),
    event_id int references events(id),
    to_emails jsonb,
    subject text,
    body_html text,
    body_text text,
    status text default 'pending',
    gmail_message_id text,
    created_at timestamptz default now(),
    sent_at timestamptz
  )`,
  `create table if not exists sync_state (
    id int primary key default 1,
    last_run_at timestamptz
  )`,
];

export async function initDb() {
  for (const stmt of STATEMENTS) {
    await sql.query(stmt);
  }
}
