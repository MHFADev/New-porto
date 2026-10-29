/*
 * Server-side auto-translation for admin-saved content.
 *
 * The site owner writes content in Indonesian in the admin panel. On save,
 * Indonesian fields are translated to English once and stored next to the
 * originals (titleEn, descEn, heroIntroEn, ...), so the public site can serve
 * either language instantly without a runtime translation call.
 *
 * Translation uses the free MyMemory API (no key). Every failure is soft:
 * the original text is kept and the En field mirrors it, so a save never
 * breaks because a translation service is down.
 */

const ID_WORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'adalah', 'ini', 'itu',
  'saya', 'aku', 'kami', 'kita', 'tidak', 'bisa', 'dapat', 'dalam', 'pada',
  'atau', 'juga', 'telah', 'akan', 'sebagai', 'oleh', 'sebuah', 'para',
  'menggunakan', 'berbasis', 'sistem', 'aplikasi', 'pengguna', 'layanan',
  'membantu', 'membangun', 'pengalaman', 'proyek', 'kerja', 'tahun', 'serta',
  'agar', 'lebih', 'saat', 'ketika', 'melalui', 'antara', 'setiap', 'semua',
]);

const EN_WORDS = new Set([
  'the', 'and', 'for', 'with', 'using', 'built', 'build', 'system', 'systems',
  'experience', 'project', 'projects', 'work', 'years', 'that', 'this', 'from',
  'into', 'across', 'helps', 'help', 'users', 'user', 'based', 'modern',
  'tools', 'tool', 'real', 'every', 'when', 'while', 'through', 'between',
]);

export function looksIndonesian(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  let id = 0;
  let en = 0;
  for (const w of words) {
    if (ID_WORDS.has(w)) id++;
    if (EN_WORDS.has(w)) en++;
  }
  return id >= 2 && id > en;
}

async function myMemory(text: string, from: string, to: string): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number | string };
  const out = data.responseData?.translatedText?.trim();
  if (!out || Number(data.responseStatus) !== 200) return null;
  return out;
}

/** Translate one field id->en. Long texts are split into sentence chunks (MyMemory caps q length). */
export async function translateIdToEn(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  if (!looksIndonesian(clean)) return clean;
  try {
    if (clean.length <= 450) {
      return (await myMemory(clean, 'id', 'en')) ?? clean;
    }
    const chunks = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [clean];
    const parts: string[] = [];
    for (const chunk of chunks) {
      const c = chunk.trim();
      if (!c) continue;
      parts.push((await myMemory(c.slice(0, 450), 'id', 'en')) ?? c);
    }
    return parts.join(' ');
  } catch {
    return clean;
  }
}

import type { Meta } from '@/lib/images';
import type { Profile } from '@/lib/profile';

type MetaLike = Meta;

const PROFILE_TEXT_FIELDS = [
  'primaryRole',
  'focus',
  'status',
  'heroIntro',
  'about',
  'aboutSecondary',
  'availability',
] as const;

/** Fill the *En fields of a Meta object by translating the originals from Indonesian. */
export async function addEnglishTranslations<T extends MetaLike>(meta: T): Promise<T> {
  const jobs: Promise<void>[] = [];
  const run = (fn: () => Promise<void>) => jobs.push(fn());

  for (const project of Object.values(meta.projects)) {
    run(async () => {
      project.titleEn = await translateIdToEn(project.title ?? '');
    });
    run(async () => {
      project.descEn = await translateIdToEn(project.desc ?? '');
    });
  }
  for (const cert of Object.values(meta.certificates)) {
    run(async () => {
      cert.titleEn = await translateIdToEn(typeof cert.title === 'string' ? cert.title : '');
    });
    run(async () => {
      cert.descEn = await translateIdToEn(typeof cert.desc === 'string' ? cert.desc : '');
    });
  }
  const profile = meta.profile as Profile & Record<string, unknown>;
  for (const field of PROFILE_TEXT_FIELDS) {
    run(async () => {
      const value = profile[field];
      if (typeof value === 'string') {
        profile[`${field}En`] = await translateIdToEn(value);
      }
    });
  }
  run(async () => {
    if (Array.isArray(profile.roles)) {
      profile.rolesEn = await Promise.all(profile.roles.map((r) => translateIdToEn(r)));
    }
  });

  await Promise.all(jobs);
  return meta;
}
