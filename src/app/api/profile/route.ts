import { readMeta } from '@/lib/images';

export async function GET() {
  try {
    const meta = await readMeta();
    return Response.json(meta.profile);
  } catch {
    return Response.json({ error: 'profile error' }, { status: 502 });
  }
}
