import { NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 });
  }
  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
