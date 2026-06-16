import { google } from 'googleapis';

function oauthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return client;
}

export function gmailClient() {
  return google.gmail({ version: 'v1', auth: oauthClient() });
}

export function calendarClient() {
  return google.calendar({ version: 'v3', auth: oauthClient() });
}

export type CalEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  attendees: { email: string; name?: string }[];
};

export async function listEvents(timeMin: Date, timeMax: Date): Promise<CalEvent[]> {
  const cal = calendarClient();
  const res = await cal.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });
  const self = process.env.GOOGLE_USER_EMAIL?.toLowerCase();
  return (res.data.items ?? []).map((e) => ({
    id: e.id!,
    title: e.summary ?? '(no title)',
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    attendees: (e.attendees ?? [])
      .filter((a) => a.email && a.email.toLowerCase() !== self)
      .map((a) => ({ email: a.email!, name: a.displayName ?? undefined })),
  }));
}

export type EmailMsg = {
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
};

function header(headers: { name?: string | null; value?: string | null }[], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

// Pull recent messages matching a Gmail search query (default: likely interview mail).
export async function searchMessages(query: string, max = 60): Promise<EmailMsg[]> {
  const gmail = gmailClient();
  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: max });
  const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
  const out: EmailMsg[] = [];
  for (const id of ids) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });
    const headers = msg.data.payload?.headers ?? [];
    out.push({
      threadId: msg.data.threadId!,
      subject: header(headers, 'Subject'),
      from: header(headers, 'From'),
      snippet: msg.data.snippet ?? '',
      date: header(headers, 'Date'),
    });
  }
  return out;
}

function base64url(input: string) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Email headers must be ASCII. Encode any header value containing non-ASCII
// characters (em-dashes, accented names) as an RFC 2047 base64 encoded-word so
// clients render them correctly instead of as mojibake.
function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

export async function sendEmail(opts: {
  to: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  fromName?: string;
}) {
  const gmail = gmailClient();
  const from = opts.fromName
    ? `${encodeHeader(opts.fromName)} <${process.env.GOOGLE_USER_EMAIL}>`
    : process.env.GOOGLE_USER_EMAIL!;
  const boundary = 'b_' + Math.random().toString(36).slice(2);
  const lines = [
    `From: ${from}`,
    `To: ${opts.to.join(', ')}`,
  ];
  if (opts.bcc?.length) lines.push(`Bcc: ${opts.bcc.join(', ')}`);
  lines.push(
    `Subject: ${encodeHeader(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.html,
    '',
    `--${boundary}--`,
  );
  const raw = base64url(lines.join('\r\n'));
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return res.data.id ?? null;
}
