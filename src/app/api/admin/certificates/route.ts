import { NextRequest } from 'next/server';
import { deleteCertificate, isValidCertificateName, uploadCertificate } from '@/lib/images';
import { isAuthed, readCookie } from '@/lib/auth';

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(req: NextRequest) {
  if (!isAuthed(readCookie(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'File sertifikat wajib dipilih.' }, { status: 400 });
  if (!ALLOWED.has(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'Gunakan PDF, JPG, PNG, WEBP, atau AVIF.' }, { status: 400 });
  }
  if (!file.size || file.size > 10 * 1024 * 1024) return Response.json({ error: 'Ukuran sertifikat maksimal 10 MB.' }, { status: 400 });
  const result = await uploadCertificate(file.name, new Uint8Array(await file.arrayBuffer()));
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json({ fileName: result.fileName, url: `/api/images/${result.path.split('/').map(encodeURIComponent).join('/')}` });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(readCookie(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const name = new URL(req.url).searchParams.get('name') ?? '';
  if (!isValidCertificateName(name)) return Response.json({ error: 'Nama file sertifikat tidak valid.' }, { status: 400 });
  const result = await deleteCertificate(name);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json({ ok: true });
}
