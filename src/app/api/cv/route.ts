import { githubFetch, imageRepoConfig, projectPath } from '@/lib/images';

export async function GET() {
  const cfg = imageRepoConfig();
  if (!cfg) return new Response('CV belum tersedia.', { status: 404 });
  try {
    const res = await githubFetch(cfg, `${projectPath()}/cv.pdf`, 'raw');
    if (!res.ok || !res.body) return new Response('CV belum tersedia.', { status: res.status === 404 ? 404 : 502 });
    return new Response(res.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cv.pdf"',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('CV tidak dapat diunduh saat ini.', { status: 502 });
  }
}
