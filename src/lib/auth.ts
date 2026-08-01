import { createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = 'admin_token';

export function verifyPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !input) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function sessionValue() {
  return createHash('sha256').update(process.env.ADMIN_PASSWORD ?? '').digest('hex');
}

export function isAuthed(cookie: string | null) {
  if (!cookie) return false;
  const expected = sessionValue();
  const a = Buffer.from(cookie, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cookieHeader() {
  return `admin_token=${sessionValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function readCookie(req: Request) {
  return req.headers.get('cookie')?.split(';').find((c) => c.trim().startsWith(`${COOKIE}=`))?.split('=').slice(1).join('=') ?? null;
}
