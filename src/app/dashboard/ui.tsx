'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Process, Thread } from '@/lib/data';

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function run() {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setMsg(res.ok ? `Synced: ${data.threads ?? 0} threads, ${data.events ?? 0} events` : `Error: ${data.error ?? 'failed'}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg bg-white text-neutral-950 text-sm font-medium px-4 py-2 hover:bg-neutral-200 disabled:opacity-50"
      >
        {loading ? 'Syncing…' : 'Sync now'}
      </button>
      {msg && <span className="text-xs text-neutral-400">{msg}</span>}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  return (
    <button onClick={logout} className="text-sm text-neutral-400 hover:text-neutral-100">
      Sign out
    </button>
  );
}

export function ProcessList({ processes }: { processes: Process[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function remove(p: Process) {
    if (!confirm(`Delete the ${p.company} process? Its emails and events stay in your data and can re-link on the next sync.`)) return;
    setBusyId(p.id);
    const res = await fetch(`/api/process/${p.id}`, { method: 'DELETE' });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <AddProcess onAdded={() => router.refresh()} />
      {processes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          No processes yet. Hit “Sync now” to scan your inbox and calendar, or add one above.
        </div>
      ) : (
        <div className="space-y-2">
          {processes.map((p) => (
            <div
              key={p.id}
              className="group rounded-lg border border-neutral-800 bg-neutral-900/50 flex items-center hover:border-neutral-600 hover:bg-neutral-900 transition-colors"
            >
              <Link href={`/process/${p.id}`} className="flex-1 px-4 py-3 flex items-center justify-between min-w-0">
                <div className="min-w-0">
                  <div className="font-medium group-hover:text-white truncate">
                    {p.company}
                    {p.role ? <span className="text-neutral-400"> · {p.role}</span> : null}
                  </div>
                  {p.stage && <div className="text-xs text-neutral-500 mt-0.5">{p.stage}</div>}
                </div>
                <span className={`shrink-0 ml-3 text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                  {p.status}
                </span>
              </Link>
              <button
                onClick={() => remove(p)}
                disabled={busyId === p.id}
                title="Delete process"
                aria-label={`Delete ${p.company}`}
                className="px-3 self-stretch text-neutral-600 hover:text-red-400 disabled:opacity-40"
              >
                {busyId === p.id ? '…' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddProcess({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!company.trim()) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company, role }),
    });
    setBusy(false);
    if (res.ok) {
      setCompany('');
      setRole('');
      setOpen(false);
      onAdded();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'failed');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-neutral-400 hover:text-neutral-100 border border-dashed border-neutral-800 rounded-lg px-4 py-2 w-full text-left hover:border-neutral-600"
      >
        + Add a process manually
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          autoFocus
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Company"
          className="flex-1 rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Role (optional)"
          className="flex-1 rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !company.trim()}
          className="rounded-md bg-white text-neutral-950 text-sm font-medium px-3 py-1.5 hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button onClick={() => { setOpen(false); setError(''); }} className="text-sm text-neutral-400 hover:text-neutral-100">
          Cancel
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}

export function ReviewThreads({ threads }: { threads: Thread[] }) {
  if (threads.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wide">Low-confidence — needs your review</h2>
      <div className="space-y-2">
        {threads.map((t) => (
          <ReviewThread key={t.id} thread={t} />
        ))}
      </div>
    </section>
  );
}

function ReviewThread({ thread: t }: { thread: Thread }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function act(action: 'keep' | 'dismiss') {
    setBusy(true);
    const res = await fetch(`/api/thread/${t.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const gmailUrl = t.gmail_thread_id ? `https://mail.google.com/mail/u/0/#all/${t.gmail_thread_id}` : null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium truncate">{t.subject ?? '(no subject)'}</div>
          <span className="text-xs text-neutral-600 shrink-0">{open ? '▾' : '▸'}</span>
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {t.contact_email} · confidence {Math.round((t.confidence ?? 0) * 100)}%
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-neutral-800 pt-3">
          {t.summary && <div className="text-xs text-neutral-400">{t.summary}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => act('keep')}
              disabled={busy}
              className="rounded-md bg-white text-neutral-950 text-xs font-medium px-3 py-1.5 hover:bg-neutral-200 disabled:opacity-50"
            >
              Keep (it’s an interview)
            </button>
            <button
              onClick={() => act('dismiss')}
              disabled={busy}
              className="rounded-md border border-neutral-700 text-xs px-3 py-1.5 hover:bg-neutral-800 disabled:opacity-50"
            >
              Not an interview
            </button>
            {t.process_id && (
              <Link href={`/process/${t.process_id}`} className="text-xs text-neutral-400 underline hover:text-neutral-100">
                View process
              </Link>
            )}
            {gmailUrl && (
              <a href={gmailUrl} target="_blank" rel="noreferrer" className="text-xs text-neutral-400 underline hover:text-neutral-100">
                Open in Gmail
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
