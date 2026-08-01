import { NextRequest } from 'next/server';
import { githubFetch, imageRepoConfig, projectPath, readMeta, writeMeta } from '@/lib/images';
import type { Meta } from '@/lib/images';
import { isAuthed, readCookie } from '@/lib/auth';

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

async function projectsWithMeta() {
  const cfg = imageRepoConfig();
  if (!cfg) throw new Error('not configured');
  const res = await githubFetch(cfg, projectPath(), 'json');
  if (!res.ok) throw new Error('project dir not found');
  const items = (await res.json()) as { name: string; type: string }[];
  const meta = (await readMeta()) ?? {};
  return items
    .filter((f) => f.type === 'file' && IMAGE_EXT.test(f.name))
    .map((f) => ({
      name: f.name,
      url: `/api/images/${encodeURIComponent(projectPath())}/${encodeURIComponent(f.name)}`,
      title: meta[f.name]?.title ?? '',
      desc: meta[f.name]?.desc ?? '',
    }));
}

export async function GET(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    return Response.json({ projects: await projectsWithMeta() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { projects } = (await req.json().catch(() => ({}))) as {
    projects?: { name: string; title?: string; desc?: string }[];
  };
  if (!Array.isArray(projects)) {
    return Response.json({ error: 'invalid body' }, { status: 400 });
  }
  const meta: Meta = {};
  for (const p of projects) {
    if (p.name) meta[p.name] = { title: p.title ?? '', desc: p.desc ?? '' };
  }
  const result = await writeMeta(meta);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }
  return Response.json({ ok: true });
}
