import { NextResponse } from 'next/server';
import { translateDetailed } from '@/lib/translate';
import { SUPPORTED } from '@/lib/langs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Runtime translation for the public site (non EN/ID languages).
 * Powered exclusively by OpenRouter LLM free models (see lib/translate.ts).
 * The response reports which provider and model produced the text so the
 * setup can be verified end to end.
 */
export async function POST(request: Request) {
  let body: { text?: unknown; from?: unknown; to?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const text = typeof body.text === 'string' ? body.text : '';
  const from = typeof body.from === 'string' ? body.from : '';
  const to = typeof body.to === 'string' ? body.to : '';
  if (!text || text.length > 2000 || !SUPPORTED.has(from) || !SUPPORTED.has(to)) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 });
  }
  const r = await translateDetailed(text, from, to);
  return NextResponse.json({ text: r.text, provider: r.provider, model: r.model });
}
