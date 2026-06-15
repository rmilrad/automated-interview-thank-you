import Link from 'next/link';
import { getPendingOutbox } from '@/lib/data';
import { ReviewList } from './ui';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  let items: Awaited<ReturnType<typeof getPendingOutbox>> = [];
  let dbError = '';
  try {
    items = await getPendingOutbox();
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Review &amp; approve</h1>
          <p className="text-sm text-neutral-400">Nothing sends until you approve it. You&apos;re BCC&apos;d on every send.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-neutral-100">← Dashboard</Link>
      </header>
      {dbError && (
        <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Database not connected yet ({dbError.slice(0, 120)}).
        </div>
      )}
      <ReviewList items={items} />
    </main>
  );
}
