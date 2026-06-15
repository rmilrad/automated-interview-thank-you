'use client';

import { useState } from 'react';

type Card = { company: string; recipientName: string | null; message: string };

export default function CardGate({ slug, company }: { slug: string; company: string }) {
  const [password, setPassword] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch(`/api/card/${slug}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      setCard(await res.json());
    } else {
      setError('That password doesn’t match.');
    }
  }

  const monogram = (company || 'T').trim().charAt(0).toUpperCase();

  if (card) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-200 px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-neutral-900 px-8 py-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-white text-neutral-900 flex items-center justify-center text-2xl font-bold">
              {monogram}
            </div>
            <div className="mt-3 text-neutral-400 text-sm tracking-wide uppercase">{card.company}</div>
          </div>
          <div className="px-8 py-10 text-center">
            <h1 className="text-xl font-semibold text-neutral-900 mb-4">
              {card.recipientName ? `Thank you, ${card.recipientName.split(' ')[0]}` : 'Thank you'}
            </h1>
            <p className="text-neutral-700 leading-relaxed">{card.message}</p>
            <div className="mt-8 text-sm text-neutral-400">— Ryan Milrad</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <form onSubmit={unlock} className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center text-xl font-bold">
          {monogram}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">A thank-you card for you</h1>
          <p className="text-sm text-neutral-400 mt-1">Enter the password from the email to open it.</p>
        </div>
        <input
          type="text"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-600 text-center"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-white text-neutral-950 font-medium py-3 text-sm hover:bg-neutral-200 disabled:opacity-50"
        >
          {loading ? 'Opening…' : 'Open card'}
        </button>
      </form>
    </main>
  );
}
