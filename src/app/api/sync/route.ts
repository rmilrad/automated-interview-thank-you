import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/session';
import { runSync } from '@/lib/sync';

export const maxDuration = 300;

export async function POST() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sync failed' }, { status: 500 });
  }
}
