import { logoPath, listImages, imageUrl, readMeta } from '@/lib/images';

export async function GET() {
  try {
    const meta = await readMeta();
    const all = await listImages(logoPath());
    const logos = all
      .filter((name) => meta.techStack.includes(name))
      .map((name) => ({ name, url: imageUrl(logoPath(), name) }));
    return Response.json(logos);
  } catch {
    return Response.json({ error: 'tech stack error' }, { status: 502 });
  }
}
