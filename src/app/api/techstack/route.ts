import { readMeta } from '@/lib/images';
import { publicTechIcon, techIcon } from '@/lib/tech';

export async function GET() {
  try {
    const meta = await readMeta();
    const icons = meta.techStack
      .map((slug) => techIcon(slug))
      .filter((i): i is NonNullable<typeof i> => !!i)
      .map(publicTechIcon);
    return Response.json(icons);
  } catch {
    return Response.json({ error: 'tech stack error' }, { status: 502 });
  }
}
