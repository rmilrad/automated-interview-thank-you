import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProcessById, getThreadsForProcess, getEventsForProcess } from '@/lib/data';
import { StatusControl } from './ui';

export const dynamic = 'force-dynamic';

function fmtDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default async function ProcessDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = Number(id);
  if (!Number.isFinite(pid)) notFound();

  const process = await getProcessById(pid);
  if (!process) notFound();

  const [threads, events] = await Promise.all([
    getThreadsForProcess(pid),
    getEventsForProcess(pid),
  ]);

  const people = Array.from(
    new Set(
      [
        ...threads.map((t) => t.contact_email).filter(Boolean),
        ...events.flatMap((e) => (e.attendees ?? []).map((a) => a.email)),
      ] as string[],
    ),
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-neutral-100">← Dashboard</Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{process.company}</h1>
        {process.role && <p className="text-neutral-400 mt-1">{process.role}</p>}
        <div className="mt-3">
          <StatusControl id={process.id} status={process.status} />
        </div>
      </header>

      <Section title="Schedule">
        {events.length === 0 ? (
          <Empty text="No calendar interviews linked yet." />
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
                <div className="font-medium text-sm">{e.title ?? '(untitled)'}</div>
                <div className="text-xs text-neutral-500 mt-1">{fmtDate(e.start_at)}</div>
                {e.attendees && e.attendees.length > 0 && (
                  <div className="text-xs text-neutral-400 mt-1">
                    {e.attendees.map((a) => a.name ?? a.email).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`People (${people.length})`}>
        {people.length === 0 ? (
          <Empty text="No contacts captured yet." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <span key={p} className="text-xs rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1 text-neutral-300">{p}</span>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Email threads (${threads.length})`}>
        {threads.length === 0 ? (
          <Empty text="No interview emails linked to this company yet." />
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <div key={t.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{t.subject ?? '(no subject)'}</div>
                  <div className="text-xs text-neutral-500 whitespace-nowrap">{fmtDate(t.last_message_at)}</div>
                </div>
                <div className="text-xs text-neutral-500 mt-1">{t.contact_email}</div>
                {t.summary && <div className="text-xs text-neutral-400 mt-2">{t.summary}</div>}
                {t.needs_review && (
                  <div className="text-xs text-amber-400 mt-2">Low confidence ({Math.round((t.confidence ?? 0) * 100)}%) — flagged for review</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-6 text-center text-sm text-neutral-500">{text}</div>;
}
