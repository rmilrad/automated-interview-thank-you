'use client';

import { useEffect, useMemo, useState } from 'react';

type Card = { company: string; recipientName: string | null; message: string };

const CONFETTI_COLORS = ['#fde68a', '#fca5a5', '#c4b5fd', '#93c5fd', '#6ee7b7', '#f9a8d4'];
// Fallback hero: cycle through gratitude/celebration emojis. Used while a GIF
// loads, and as a permanent stand-in if no Giphy key is configured or the
// fetch fails — so the card is always on-theme and never blank.
const HERO_EMOJI = ['🙏', '🎉', '🥳', '🤝', '✨'];

// Optional: when a Giphy API key is provided we search "thank you" and show a
// random (G-rated) result. The G rating + the search query keep it on-theme.
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

async function fetchRandomThankYouGif(signal: AbortSignal): Promise<string | null> {
  if (!GIPHY_KEY) return null;
  const url =
    `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_KEY)}` +
    `&q=${encodeURIComponent('thank you')}&limit=50&rating=g&lang=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { images?: { fixed_height?: { url?: string }; original?: { url?: string } } }[];
  };
  const items = json.data ?? [];
  if (!items.length) return null;
  const pick = items[Math.floor(Math.random() * items.length)];
  return pick?.images?.fixed_height?.url ?? pick?.images?.original?.url ?? null;
}

function Confetti() {
  // Pre-compute a stable set of confetti pieces so they don't reshuffle on
  // every render (which would restart their animations and look glitchy).
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => {
        const left = Math.random() * 100;
        const drift = `${(Math.random() * 2 - 1) * 18}vw`;
        const delay = Math.random() * 4;
        const duration = 4 + Math.random() * 4;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = 6 + Math.random() * 8;
        return { left, drift, delay, duration, color, size, i };
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="ty-confetti"
          style={{
            left: `${p.left}vw`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            // @ts-expect-error custom property used by the keyframes
            '--drift': p.drift,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function OpenedCard({ card, onReplay }: { card: Card; onReplay: () => void }) {
  const firstName = card.recipientName ? card.recipientName.split(' ')[0] : null;

  // Cycle through gratitude emojis so the fallback hero feels alive like a
  // sticker/GIF, while staying 100% on-theme ("thank you" / "appreciation").
  const [emojiIdx, setEmojiIdx] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setEmojiIdx((i) => (i + 1) % HERO_EMOJI.length), 1100);
    return () => clearInterval(t);
  }, []);

  // Pull a random "thank you" GIF from Giphy when a key is configured. Falls
  // back silently to the emoji hero if there's no key, the request fails, or
  // the image errors out.
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifBroken, setGifBroken] = useState(false);
  useEffect(() => {
    const ac = new AbortController();
    fetchRandomThankYouGif(ac.signal)
      .then((u) => setGifUrl(u))
      .catch(() => {});
    return () => ac.abort();
  }, []);
  const showGif = gifUrl && !gifBroken;

  return (
    <main className="relative min-h-screen overflow-hidden ty-gradient flex items-center justify-center px-4 py-12">
      <Confetti />

      <div className="ty-pop relative z-10 w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur-sm shadow-2xl ring-1 ring-black/5 px-8 py-10 text-center">
        {showGif ? (
          <div className="ty-pop mx-auto mb-6 w-44 h-44 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gifUrl}
              alt="A thank-you GIF"
              className="w-44 h-44 rounded-2xl object-contain shadow-lg bg-white"
              onError={() => setGifBroken(true)}
            />
          </div>
        ) : (
          <div className="mx-auto mb-6 w-40 h-40 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-100 via-rose-100 to-violet-100 shadow-inner">
            <div
              key={emojiIdx}
              className="ty-float ty-pop text-[6rem] leading-none select-none"
              role="img"
              aria-label="A grateful thank you"
            >
              {HERO_EMOJI[emojiIdx]}
            </div>
          </div>
        )}

        <div
          className="ty-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500"
          style={{ animationDelay: '0.15s' }}
        >
          {card.company}
        </div>

        <h1
          className="ty-fade-up mt-2 text-3xl sm:text-4xl font-extrabold text-neutral-900"
          style={{ animationDelay: '0.3s' }}
        >
          {firstName ? `Thank you, ${firstName}!` : 'Thank you!'}
        </h1>

        <p
          className="ty-fade-up mt-5 text-neutral-700 leading-relaxed text-lg"
          style={{ animationDelay: '0.5s' }}
        >
          {card.message}
        </p>

        <div
          className="ty-fade-up mt-8 flex flex-col items-center gap-4"
          style={{ animationDelay: '0.7s' }}
        >
          <div className="text-sm font-medium text-neutral-500">— Ryan Milrad</div>
          <button
            onClick={onReplay}
            className="rounded-full bg-neutral-900 text-white text-sm font-medium px-5 py-2 hover:bg-neutral-700 transition-colors"
          >
            ↻ Play it again
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CardGate({ slug, company }: { slug: string; company: string }) {
  const [password, setPassword] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Bumping this key remounts the opened card, which replays every animation.
  const [replayKey, setReplayKey] = useState(0);

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
      <OpenedCard
        key={replayKey}
        card={card}
        onReplay={() => setReplayKey((k) => k + 1)}
      />
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
