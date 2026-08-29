import { NextRequest } from 'next/server';
import { imageUrl, projectPath, uploadProjectImage } from '@/lib/images';
import { isAuthed, readCookie } from '@/lib/auth';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

function matchesSignature(bytes: Uint8Array, type: string) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes[0] === 0x89 && ascii(1, 4) === 'PNG';
  if (type === 'image/gif') return ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a';
  if (type === 'image/webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if (type === 'image/avif') return ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12));
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Pilih gambar untuk di-upload.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: 'Format harus JPG, PNG, WebP, AVIF, atau GIF.' }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'Ukuran gambar harus di antara 1 byte dan 8 MB.' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, file.type)) {
    return Response.json({ error: 'Isi file tidak cocok dengan format gambarnya.' }, { status: 415 });
  }
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const result = await uploadProjectImage(`${baseName}${TYPE_EXTENSION[file.type]}`, bytes);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({
    project: {
      name: result.fileName,
      url: imageUrl(projectPath(), result.fileName),
      title: '',
      desc: '',
      techStack: [],
    },
  });
}
