import { NextRequest } from 'next/server';
import { githubFetch, imageRepoConfig, projectPath, imageUrl, readMeta, writeMeta } from '@/lib/images';
import type { Meta } from '@/lib/images';
import { TECH_ICONS, hasTechIcon, publicTechIcon, techIcon } from '@/lib/tech';
import { normalizeProfile } from '@/lib/profile';
import type { Profile } from '@/lib/profile';
import { isAuthed, readCookie } from '@/lib/auth';

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

async function projectsWithMeta(meta: Meta) {
  const cfg = imageRepoConfig();
  if (!cfg) return [];
  const res = await githubFetch(cfg, projectPath(), 'json');
  // GitHub does not keep empty directories. Before the first upload the configured
  // project path legitimately returns 404, so treat it as an empty collection.
  if (res.status === 404) return [];
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`GitHub ${res.status}: ${detail?.message ?? 'gagal membaca folder project'}`);
  }
  const items = (await res.json()) as { name: string; type: string }[];
  return items
    .filter((f) => f.type === 'file' && IMAGE_EXT.test(f.name))
    .map((f) => ({
      name: f.name,
      url: imageUrl(projectPath(), f.name),
      title: meta.projects[f.name]?.title ?? '',
      desc: meta.projects[f.name]?.desc ?? '',
      techStack: meta.projects[f.name]?.techStack ?? [],
    }));
}

export async function GET(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const meta = await readMeta();
    const selectedSlugs = Object.values(meta.projects).flatMap((project) => project.techStack ?? []);
    const initialSlugs = new Set([...TECH_ICONS.map((icon) => icon.slug), ...meta.techStack, ...selectedSlugs]);
    const icons = [...initialSlugs]
      .map((slug) => techIcon(slug))
      .filter((icon): icon is NonNullable<typeof icon> => Boolean(icon))
      .map(publicTechIcon);
    return Response.json({
      projects: await projectsWithMeta(meta),
      icons,
      techStack: meta.techStack,
      profile: meta.profile,
      storageConfigured: Boolean(imageRepoConfig()),
    });
  } catch (e) {
    console.error('Failed to load admin project data:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { projects, techStack, profile } = (await req.json().catch(() => ({}))) as {
    projects?: { name: string; title?: string; desc?: string; techStack?: string[] }[];
    techStack?: string[];
    profile?: Partial<Profile>;
  };
  if (!Array.isArray(projects)) {
    return Response.json({ error: 'invalid body' }, { status: 400 });
  }
  const meta: Meta = {
    projects: {},
    techStack: (Array.isArray(techStack) ? techStack : []).filter(hasTechIcon),
    profile: normalizeProfile(profile),
  };
  for (const p of projects) {
    if (p.name) {
      meta.projects[p.name] = {
        title: p.title ?? '',
        desc: p.desc ?? '',
        techStack: (Array.isArray(p.techStack) ? p.techStack : []).filter(hasTechIcon),
      };
    }
  }
  const result = await writeMeta(meta);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }
  return Response.json({ ok: true });
}
