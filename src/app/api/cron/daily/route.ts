import { NextResponse } from 'next/server';
import { runSync, prepareThankYous } from '@/lib/sync';

export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const sync = await runSync();
    const prep = await prepareThankYous(new Date(), process.env.SENDER_NAME ?? 'Ryan Milrad');
    return NextResponse.json({ ok: true, sync, prep });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'cron failed' }, { status: 500 });
  }
}
