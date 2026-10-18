import { NextRequest } from 'next/server';
import { deletePortfolioCv, uploadPortfolioCv } from '@/lib/images';
import { isAuthed, readCookie } from '@/lib/auth';

const MAX_CV_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')) {
    return Response.json({ error: 'Pilih file PDF untuk CV.' }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_CV_SIZE) {
    return Response.json({ error: 'Ukuran CV harus di antara 1 byte dan 10 MB.' }, { status: 413 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
    return Response.json({ error: 'Isi file tidak cocok dengan format PDF.' }, { status: 415 });
  }
  const result = await uploadPortfolioCv(bytes);
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json({ ok: true, fileName: result.fileName });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(readCookie(req))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await deletePortfolioCv();
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
  return Response.json({ ok: true });
}
