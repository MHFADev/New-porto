import { NextRequest } from 'next/server';
import { cookieHeader, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!verifyPassword(password ?? '')) {
    return Response.json({ error: 'invalid password' }, { status: 401 });
  }
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookieHeader() } });
}
