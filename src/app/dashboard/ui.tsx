'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
