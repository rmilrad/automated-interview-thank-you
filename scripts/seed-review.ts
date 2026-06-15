import './load-env';
import { sql } from '../src/lib/db';
import { draftThankYou } from '../src/lib/anthropic';
import { randomSlug, cardPassword } from '../src/lib/util';

// Seeds ONE safe, self-addressed thank-you into the review queue so the approve
// flow can be exercised end-to-end. Recipient is forced to the user's own email
// — never a real interviewer.
async function main() {
  const self = process.env.GOOGLE_USER_EMAIL!;
  const senderName = process.env.SENDER_NAME ?? 'Ryan Milrad';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';

  const ev = (await sql`
    select id, title, company, attendees from events
    where company is not null order by start_at desc limit 1
  `) as Array<{ id: number; title: string; company: string | null; attendees: { email: string; name?: string }[] }>;
  if (!ev.length) { console.log('No events to seed from.'); return; }
  const e = ev[0];
  const company = e.company ?? 'the team';
  const recipientName = senderName;

  const draft = await draftThankYou({ company, role: null, recipientName, interviewTitle: e.title, senderName });
  const slug = randomSlug();
  const password = cardPassword(company);
  const card = (await sql`
    insert into cards (slug, event_id, company, recipient_name, message, password)
    values (${slug}, ${e.id}, ${company}, ${recipientName}, ${draft.cardMessage}, ${password})
    returning id`) as { id: number }[];

  const link = `${baseUrl}/card/${slug}`;
  const text = `${draft.emailText}\n\nYour thank-you card: ${link}\nPassword: ${password}\n\n— ${senderName}`;
  const html = `<div style="font-family:sans-serif"><p>${draft.emailText.replace(/\n/g, '<br>')}</p>
    <p><a href="${link}">Open your thank-you card</a> · Password: <strong>${password}</strong></p>
    <p>— ${senderName}</p></div>`;

  await sql`
    insert into outbox (card_id, event_id, to_emails, subject, body_html, body_text, status)
    values (${card[0].id}, ${e.id}, ${JSON.stringify([self])}, ${'[TEST] ' + draft.emailSubject}, ${html}, ${text}, 'pending')`;

  console.log(`Seeded 1 pending thank-you for "${company}" → ${self} (card /card/${slug}, pw ${password}).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
