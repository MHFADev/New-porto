import { NextRequest } from 'next/server';
import { githubFetch, imageRepoConfig, projectPath, imageUrl, readMeta, writeMeta } from '@/lib/images';
import type { Meta } from '@/lib/images';
import { TECH_ICONS, iconUrl } from '@/lib/tech';
import { isAuthed, readCookie } from '@/lib/auth';

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

async function projectsWithMeta() {
  const cfg = imageRepoConfig();
  if (!cfg) {
    throw new Error('GitHub storage belum dikonfigurasi. Isi IMAGE_REPO_URL dan IMAGE_REPO_PAT di Vercel.');
  }
  const res = await githubFetch(cfg, projectPath(), 'json');
  // GitHub does not keep empty directories. Before the first upload the configured
  // project path legitimately returns 404, so treat it as an empty collection.
  if (res.status === 404) return [];
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`GitHub ${res.status}: ${detail?.message ?? 'gagal membaca folder project'}`);
  }
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
    const icons = TECH_ICONS.map((i) => ({ ...i, url: iconUrl(i.slug) }));
    return Response.json({ projects: await projectsWithMeta(), icons, techStack: meta.techStack });
  } catch (e) {
    console.error('Failed to load admin project data:', e);
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
  const validSlugs = new Set(TECH_ICONS.map((i) => i.slug));
  const meta: Meta = {
    projects: {},
    techStack: (Array.isArray(techStack) ? techStack : []).filter((s) => validSlugs.has(s)),
  };
  for (const p of projects) {
    if (p.name) meta.projects[p.name] = { title: p.title ?? '', desc: p.desc ?? '' };
  }
  const result = await writeMeta(meta);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }
  return Response.json({ ok: true });
}
