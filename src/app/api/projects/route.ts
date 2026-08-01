import { githubFetch, imageRepoConfig, projectPath, readMeta } from '@/lib/images';

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

export async function GET() {
  const cfg = imageRepoConfig();
  if (!cfg) {
    return Response.json({ error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' }, { status: 500 });
  }

  try {
    const res = await githubFetch(cfg, projectPath(), 'json');
    if (!res.ok) {
      return Response.json({ error: 'project dir not found' }, { status: res.status });
    }
    const items = (await res.json()) as { name: string; type: string }[];
    const meta = await readMeta();
    const projects = items
      .filter((f) => f.type === 'file' && IMAGE_EXT.test(f.name))
      .map((f) => ({
        name: f.name,
        url: `/api/images/${encodeURIComponent(projectPath())}/${encodeURIComponent(f.name)}`,
        title: meta.projects[f.name]?.title ?? '',
        desc: meta.projects[f.name]?.desc ?? '',
      }));
    return Response.json(projects);
  } catch {
    return Response.json({ error: 'project list error' }, { status: 502 });
  }
}
