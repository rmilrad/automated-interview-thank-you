import Link from 'next/link';
import { getProcesses, getThreadsNeedingReview, getPendingOutbox } from '@/lib/data';
import { SyncButton, LogoutButton, ProcessList, ReviewThreads } from './ui';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let processes: Awaited<ReturnType<typeof getProcesses>> = [];
  let review: Awaited<ReturnType<typeof getThreadsNeedingReview>> = [];
  let pending: Awaited<ReturnType<typeof getPendingOutbox>> = [];
  let dbError = '';
  try {
    [processes, review, pending] = await Promise.all([
      getProcesses(),
      getThreadsNeedingReview(),
      getPendingOutbox(),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">interview-ty</h1>
          <p className="text-sm text-neutral-400">Interview pipeline + thank-you automation</p>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/review" className="text-sm text-neutral-400 hover:text-neutral-100">Review</Link>
          <Link href="/sent" className="text-sm text-neutral-400 hover:text-neutral-100">Sent</Link>
          <SyncButton />
          <LogoutButton />
        </div>
      </header>

      {dbError && (
        <div className="mb-8 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Database not connected yet ({dbError.slice(0, 120)}). Set DATABASE_URL and run the migration.
        </div>
      )}

      <section className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="Active processes" value={processes.filter((p) => p.status === 'active').length} />
        <Stat label="Threads to review" value={review.length} />
        <Link href="/review" className="block">
          <Stat label="Thank-yous awaiting approval" value={pending.length} accent={pending.length > 0} />
        </Link>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wide">Interview processes</h2>
        <ProcessList processes={processes} />
      </section>

      <ReviewThreads threads={review} />
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-4 ${accent ? 'border-white/30 bg-white/5' : 'border-neutral-800 bg-neutral-900/50'}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-neutral-400 mt-1">{label}</div>
    </div>
  );
}
