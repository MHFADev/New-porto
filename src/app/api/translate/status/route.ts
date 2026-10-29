import { NextResponse } from 'next/server';
import { openRouterConfigured, translateDetailed, translateBatchIdEnDetailed } from '@/lib/translate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Diagnostic check for the OpenRouter translation setup. Runs one single
 * translation and one batched admin-style translation, and reports the
 * provider, the model that answered, and the raw error when a call fails.
 * It never exposes the API key itself.
 */
export async function GET() {
  const configured = openRouterConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false, single: null, batch: null });
  }
  const single = await translateDetailed(
    'Aplikasi manajemen kelas untuk memantau komputer siswa',
    'id',
    'en',
  );
  const batch = await translateBatchIdEnDetailed([
    'Aplikasi manajemen kelas untuk guru',
    'Sertifikat dasar jaringan komputer',
  ]).catch(() => null);
  return NextResponse.json({
    configured: true,
    single: {
      ok: single.provider === 'openrouter',
      provider: single.provider,
      model: single.model,
      status: single.status,
      error: single.error,
      output: single.text,
    },
    batch: batch
      ? {
          ok: batch.results.every((r) => r !== null),
          model: batch.model,
          status: batch.status,
          error: batch.error,
          outputs: batch.results,
        }
      : null,
  });
}
