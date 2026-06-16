import Link from 'next/link';
import { getSentOutbox } from '@/lib/data';

export const dynamic = 'force-dynamic';

function fmtDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default async function SentPage() {
  let items: Awaited<ReturnType<typeof getSentOutbox>> = [];
  let dbError = '';
  try {
    items = await getSentOutbox();
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sent thank-yous</h1>
          <p className="text-sm text-neutral-400">Every card that has gone out, with its link and password.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-neutral-100">← Dashboard</Link>
      </header>

      {dbError && (
        <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Database not connected yet ({dbError.slice(0, 120)}).
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-10 text-center text-sm text-neutral-500">
          Nothing sent yet. Approved thank-yous show up here.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{item.card_company ?? item.subject ?? '(thank-you)'}</div>
                <div className="text-xs text-neutral-500 whitespace-nowrap">{fmtDate(item.sent_at)}</div>
              </div>
              <div className="text-xs text-neutral-500 mt-1">To {item.to_emails?.join(', ')}</div>
              {item.subject && <div className="text-xs text-neutral-400 mt-1">{item.subject}</div>}
              {item.card_slug && (
                <div className="text-xs text-neutral-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`/card/${item.card_slug}`} target="_blank" className="underline text-neutral-300">/card/{item.card_slug}</a>
                  <span>Password: <span className="font-mono text-neutral-300">{item.card_password}</span></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
