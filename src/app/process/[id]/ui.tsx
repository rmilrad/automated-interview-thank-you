'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StatusControl({ id, status }: { id: number; status: string }) {
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function setStatus(next: string) {
    if (next === current || busy) return;
    setBusy(true);
    const res = await fetch(`/api/process/${id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) {
      setCurrent(next);
      router.refresh();
    }
  }

  const isRejected = current === 'rejected';
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block text-xs px-2 py-1 rounded-full ${
          isRejected ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
        }`}
      >
        {current}
      </span>
      <button
        onClick={() => setStatus(isRejected ? 'active' : 'rejected')}
        disabled={busy}
        className="text-xs px-2 py-1 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
      >
        {busy ? '…' : isRejected ? 'Reopen as active' : 'Mark rejected'}
      </button>
    </div>
  );
}
