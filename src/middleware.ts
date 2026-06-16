import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

async function authed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('itk_session')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  if (await authed(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/review/:path*', '/process/:path*', '/sent/:path*'],
};
