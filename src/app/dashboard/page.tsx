import Link from 'next/link';
import { getProcesses, getThreadsNeedingReview, getPendingOutbox } from '@/lib/data';
import { SyncButton, LogoutButton } from './ui';

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
        <Stat label="Threads to review" value={review.length} href={review.length ? undefined : undefined} />
        <Link href="/review" className="block">
          <Stat label="Thank-yous awaiting approval" value={pending.length} accent={pending.length > 0} />
        </Link>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wide">Interview processes</h2>
        {processes.length === 0 ? (
          <Empty text="No processes yet. Hit “Sync now” to scan your inbox and calendar." />
        ) : (
          <div className="space-y-2">
            {processes.map((p) => (
              <Link
                key={p.id}
                href={`/process/${p.id}`}
                className="group rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 flex items-center justify-between hover:border-neutral-600 hover:bg-neutral-900 transition-colors"
              >
                <div>
                  <div className="font-medium group-hover:text-white">{p.company}{p.role ? <span className="text-neutral-400"> · {p.role}</span> : null}</div>
                  {p.stage && <div className="text-xs text-neutral-500 mt-0.5">{p.stage}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    {p.status}
                  </span>
                  <span className="text-neutral-600 group-hover:text-neutral-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {review.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wide">Low-confidence — needs your review</h2>
          <div className="space-y-2">
            {review.map((t) => (
              <div key={t.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
                <div className="text-sm font-medium">{t.subject ?? '(no subject)'}</div>
                <div className="text-xs text-neutral-500 mt-1">{t.contact_email} · confidence {Math.round((t.confidence ?? 0) * 100)}%</div>
                {t.summary && <div className="text-xs text-neutral-400 mt-1">{t.summary}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, accent, href }: { label: string; value: number; accent?: boolean; href?: string }) {
  return (
    <div className={`rounded-lg border px-4 py-4 ${accent ? 'border-white/30 bg-white/5' : 'border-neutral-800 bg-neutral-900/50'}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-neutral-400 mt-1">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">{text}</div>;
}
