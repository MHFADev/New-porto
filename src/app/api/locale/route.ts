import { headers } from 'next/headers';
import { COUNTRY_LANG } from '@/lib/langs';

/*
 * Region hint for the client language detector.
 * Vercel sets x-vercel-ip-country on every request; the client maps the
 * visitor's region to a site language with this table. When the header is
 * absent (local dev, other hosts) the client falls back to browser language.
 */
export async function GET() {
  const country = (await headers()).get('x-vercel-ip-country');
  if (!country) return Response.json({ lang: null, country: null });
  const code = country.toUpperCase();
  return Response.json({ lang: COUNTRY_LANG[code] ?? 'en', country: code });
}
