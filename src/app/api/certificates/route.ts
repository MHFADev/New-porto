import { githubFetch, imageRepoConfig, projectPath, readMeta } from '@/lib/images';

const FILE = /\.(?:jpe?g|png|webp|avif|gif|pdf)$/i;

export async function GET() {
  const cfg = imageRepoConfig();
  if (!cfg) return Response.json([]);
  try {
    const res = await githubFetch(cfg, `${projectPath()}/certificates`, 'json');
    if (res.status === 404) return Response.json([]);
    if (!res.ok) return Response.json({ error: 'certificate list error' }, { status: res.status });
    const items = (await res.json()) as { name: string; type: string }[];
    const meta = await readMeta();
    return Response.json(items.filter((item) => item.type === 'file' && FILE.test(item.name)).map((item) => ({
      name: item.name,
      url: `/api/images/${encodeURIComponent(projectPath())}/certificates/${encodeURIComponent(item.name)}`,
      title: meta.certificates[item.name]?.title ?? '',
      issuer: meta.certificates[item.name]?.issuer ?? '',
      year: meta.certificates[item.name]?.year ?? '',
      desc: meta.certificates[item.name]?.desc ?? '',
      verifyUrl: meta.certificates[item.name]?.verifyUrl ?? '',
    })));
  } catch {
    return Response.json({ error: 'certificate list error' }, { status: 502 });
  }
}
