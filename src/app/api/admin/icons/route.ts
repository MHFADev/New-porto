import { NextRequest } from 'next/server';
import { isAuthed, readCookie } from '@/lib/auth';
import { publicTechIcon, searchTechIcons } from '@/lib/tech';

export async function GET(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get('q') ?? '';
  return Response.json({ icons: searchTechIcons(query).map(publicTechIcon) });
}
