import { NextRequest } from 'next/server';
import { githubFetch, imageRepoConfig } from '@/lib/images';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const cfg = imageRepoConfig();
  if (!cfg) {
    return new Response('IMAGE_REPO_URL / IMAGE_REPO_PAT not set', { status: 500 });
  }

  const filePath = (await params).path.join('/');

  try {
    const res = await githubFetch(cfg, filePath, 'raw');
    if (!res.ok) {
      return new Response('Image not found', { status: res.status });
    }

    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    return new Response(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Image proxy error', { status: 502 });
  }
}
