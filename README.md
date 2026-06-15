# automated-interview-thank-you

A private interview command center. It reads your Gmail and Google Calendar, organizes every
interview process onto a minimalist dashboard, and prepares a digital thank-you card + draft
email for each day's interviews. **Nothing is sent until you review and click Approve** — and
you're always BCC'd on what goes out.

Built with Next.js (App Router), Postgres (Neon), Google OAuth, and the Anthropic API.

## How it works

1. A daily cron syncs Calendar events and interview-related Gmail threads into Postgres.
2. Emails are classified (interview vs. not) and processes are grouped by company.
3. For each interview that day, it drafts a thank-you note and a password-protected card page.
4. You open the **Review** queue, read each draft, and Approve or Skip. Approved notes send
   from your own Gmail with you BCC'd.
5. Each thank-you card lives at a permanent `/card/<slug>` link, openable anytime with its password.

## Setup

1. `cp .env.example .env.local` and fill in every value.
   - **Google**: create a *Desktop app* OAuth client (Gmail + Calendar scopes), then run
     `node scripts/get-google-token.mjs` to mint `GOOGLE_REFRESH_TOKEN`.
   - **Database**: a Neon (or any) Postgres connection string.
   - **Anthropic**: an API key from console.anthropic.com.
   - `SESSION_SECRET` / `CRON_SECRET`: random strings.
2. `npm install`
3. `npm run dev`, open http://localhost:3000, log in with `ADMIN_PASSWORD`.
4. Backfill from your real mailbox/calendar: `node --import tsx scripts/run-sync.ts`.

## Deploy (Vercel)

1. Import the repo in Vercel.
2. Add every variable from `.env.example` as a Project Environment Variable.
3. Set `NEXT_PUBLIC_BASE_URL` to your deployed URL so card links resolve publicly.
4. The daily cron is defined in `vercel.json` and runs automatically.

## Safety

- All secrets live in `.env.local` (gitignored) or Vercel env vars — never in the repo.
- The send step is gated behind manual approval; the app never emails anyone on its own.
