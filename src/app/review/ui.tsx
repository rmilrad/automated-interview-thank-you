'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OutboxItem } from '@/lib/data';

export function ReviewList({ items }: { items: OutboxItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-10 text-center text-sm text-neutral-500">
        Nothing awaiting approval. Thank-you notes appear here after the daily run.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ReviewCard({ item }: { item: OutboxItem }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'skipped' | 'error'>('idle');
  const [error, setError] = useState('');
  const router = useRouter();

  async function act(kind: 'approve' | 'skip') {
    setStatus(kind === 'approve' ? 'sending' : 'idle');
    setError('');
    const res = await fetch(`/api/review/${item.id}/${kind}`, { method: 'POST' });
    if (res.ok) {
      setStatus(kind === 'approve' ? 'sent' : 'skipped');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setStatus('error');
      setError(d.error ?? 'failed');
    }
  }

  const cardUrl = item.card_slug ? `/card/${item.card_slug}` : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-500">To</div>
          <div className="text-sm font-medium">{item.to_emails?.join(', ')}</div>
        </div>
        <div className="text-xs text-neutral-500">{item.card_company}</div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <div className="text-xs text-neutral-500 mb-1">Subject</div>
          <div className="text-sm">{item.subject}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">Message</div>
          <pre className="text-sm whitespace-pre-wrap font-sans text-neutral-300">{item.body_text}</pre>
        </div>
        {cardUrl && (
          <div className="rounded-lg bg-neutral-950 border border-neutral-800 px-4 py-3 text-xs flex items-center justify-between">
            <span className="text-neutral-400">Card: <a href={cardUrl} target="_blank" className="underline">{cardUrl}</a></span>
            <span className="text-neutral-400">Password: <span className="font-mono text-neutral-200">{item.card_password}</span></span>
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-neutral-800 flex items-center gap-3">
        {status === 'sent' ? (
          <span className="text-sm text-emerald-400">✓ Sent (you were BCC’d)</span>
        ) : status === 'skipped' ? (
          <span className="text-sm text-neutral-500">Skipped</span>
        ) : (
          <>
            <button
              onClick={() => act('approve')}
              disabled={status === 'sending'}
              className="rounded-lg bg-white text-neutral-950 text-sm font-medium px-4 py-2 hover:bg-neutral-200 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Approve & send'}
            </button>
            <button
              onClick={() => act('skip')}
              className="rounded-lg border border-neutral-700 text-sm px-4 py-2 hover:bg-neutral-800"
            >
              Skip
            </button>
          </>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
