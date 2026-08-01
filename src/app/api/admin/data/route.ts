import { NextRequest } from 'next/server';
import { githubFetch, imageRepoConfig, projectPath, logoPath, listImages, imageUrl, readMeta, writeMeta } from '@/lib/images';
import type { Meta } from '@/lib/images';
import { isAuthed, readCookie } from '@/lib/auth';

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

async function projectsWithMeta() {
  const cfg = imageRepoConfig();
  if (!cfg) throw new Error('not configured');
  const res = await githubFetch(cfg, projectPath(), 'json');
  if (!res.ok) throw new Error('project dir not found');
  const items = (await res.json()) as { name: string; type: string }[];
  const meta = await readMeta();
  return items
    .filter((f) => f.type === 'file' && IMAGE_EXT.test(f.name))
    .map((f) => ({
      name: f.name,
      url: imageUrl(projectPath(), f.name),
      title: meta.projects[f.name]?.title ?? '',
      desc: meta.projects[f.name]?.desc ?? '',
    }));
}

export async function GET(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const meta = await readMeta();
    const logos = (await listImages(logoPath())).map((name) => ({
      name,
      url: imageUrl(logoPath(), name),
      selected: meta.techStack.includes(name),
    }));
    return Response.json({ projects: await projectsWithMeta(), logos, techStack: meta.techStack });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { projects, techStack } = (await req.json().catch(() => ({}))) as {
    projects?: { name: string; title?: string; desc?: string }[];
    techStack?: string[];
  };
  if (!Array.isArray(projects)) {
    return Response.json({ error: 'invalid body' }, { status: 400 });
  }
  const meta: Meta = { projects: {}, techStack: Array.isArray(techStack) ? techStack : [] };
  for (const p of projects) {
    if (p.name) meta.projects[p.name] = { title: p.title ?? '', desc: p.desc ?? '' };
  }
  const result = await writeMeta(meta);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }
  return Response.json({ ok: true });
}
