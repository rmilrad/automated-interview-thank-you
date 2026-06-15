import fs from 'node:fs';
import path from 'node:path';

// Force-load .env.local, overriding any inherited environment variables.
// Node's --env-file does NOT override vars already present in the environment
// (e.g. ANTHROPIC_API_KEY injected by the host runtime), so we do it ourselves.
const file = path.join(process.cwd(), '.env.local');
const raw = fs.readFileSync(file, 'utf8');
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}
