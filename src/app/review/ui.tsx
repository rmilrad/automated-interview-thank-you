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

  // Local copy of the editable fields so the user can tweak the email before
  // approving. These start from what the daily run drafted.
  const [subject, setSubject] = useState(item.subject ?? '');
  const [bodyText, setBodyText] = useState(item.body_text ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = subject !== (item.subject ?? '') || bodyText !== (item.body_text ?? '');

  async function save() {
    if (!subject.trim() || !bodyText.trim()) {
      setError('Subject and message can’t be empty.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch(`/api/outbox/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject, body_text: bodyText }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'failed to save');
    }
  }

  function cancelEdit() {
    setSubject(item.subject ?? '');
    setBodyText(item.body_text ?? '');
    setEditing(false);
    setError('');
  }

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
  const done = status === 'sent' || status === 'skipped';

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-500">To</div>
          <div className="text-sm font-medium">{item.to_emails?.join(', ')}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-neutral-500">{item.card_company}</div>
          {!done && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-neutral-400 underline hover:text-neutral-100"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <div className="text-xs text-neutral-500 mb-1">Subject</div>
          {editing ? (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
            />
          ) : (
            <div className="text-sm">{item.subject}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-neutral-500 mb-1">Message</div>
          {editing ? (
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={Math.max(6, bodyText.split('\n').length + 1)}
              className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm font-sans leading-relaxed outline-none focus:border-neutral-600 resize-y"
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-sans text-neutral-300">{item.body_text}</pre>
          )}
        </div>
        {editing && (
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="rounded-md bg-white text-neutral-950 text-sm font-medium px-3 py-1.5 hover:bg-neutral-200 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={cancelEdit}
              className="text-sm text-neutral-400 hover:text-neutral-100"
            >
              Cancel
            </button>
          </div>
        )}
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
              disabled={status === 'sending' || editing}
              title={editing ? 'Save or cancel your edits first' : undefined}
              className="rounded-lg bg-white text-neutral-950 text-sm font-medium px-4 py-2 hover:bg-neutral-200 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Approve & send'}
            </button>
            <button
              onClick={() => act('skip')}
              disabled={editing}
              className="rounded-lg border border-neutral-700 text-sm px-4 py-2 hover:bg-neutral-800 disabled:opacity-50"
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
