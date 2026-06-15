import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import CardGate from './ui';

export const dynamic = 'force-dynamic';

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let company = '';
  let found = false;
  try {
    const rows = (await sql`select company from cards where slug = ${slug}`) as { company: string }[];
    if (rows.length) {
      found = true;
      company = rows[0].company;
    }
  } catch {
    notFound();
  }
  if (!found) notFound();
  return <CardGate slug={slug} company={company} />;
}
