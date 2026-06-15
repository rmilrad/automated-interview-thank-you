// One-time helper: mints a Google OAuth refresh token for Gmail + Calendar.
// Usage:
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-token.mjs
// Then paste the printed refresh token into .env.local as GOOGLE_REFRESH_TOKEN.

import http from 'node:http';
import { exec } from 'node:child_process';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.');
  process.exit(1);
}

const PORT = 5858;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  try {
    const code = new URL(req.url, REDIRECT).searchParams.get('code');
    if (!code) {
      res.end('Waiting for Google redirect...');
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    res.end('Success. Close this tab and return to the terminal.');
    console.log('\n=== GOOGLE_REFRESH_TOKEN ===\n');
    console.log(tokens.refresh_token);
    console.log('\nPaste this back to Claude, or into .env.local.\n');
    server.close();
    process.exit(0);
  } catch (e) {
    res.end('Error: ' + e.message);
    console.error(e);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('Opening browser for Google authorization...');
  console.log('If it does not open, visit:\n\n' + authUrl + '\n');
  const opener = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} "${authUrl}"`);
});
