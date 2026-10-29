/*
 * Server-side translation for admin-saved content and the /api/translate
 * route used by the public site.
 *
 * Provider chain (all free, no key required; first success wins):
 *   1. LibreTranslate, when LIBRETRANSLATE_URL points at an instance. This is
 *      the open-source option: run your own (single Docker container, models
 *      included) and set LIBRETRANSLATE_URL (and LIBRETRANSLATE_KEY if the
 *      instance requires one). Nothing leaves your own infrastructure then.
 *   2. Google Translate's free web endpoint (no key).
 *   3. MyMemory (no key; MYMEMORY_EMAIL raises the free daily quota).
 *
 * Every provider result passes an echo guard: an answer identical to the
 * input counts as a failure (some free instances silently echo text back),
 * as does empty or HTML output. All failures are soft: callers fall back to
 * the original text, so a save or page view never breaks over translation.
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

async function fetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000), cache: 'no-store', ...init });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

function usable(out: string | null | undefined, input: string): string | null {
  if (!out) return null;
  const clean = out.trim();
  if (!clean || clean.startsWith('<')) return null;
  if (clean.toLowerCase() === input.trim().toLowerCase()) return null; // echo guard
  return clean;
}

async function viaLibreTranslate(text: string, from: string, to: string): Promise<string | null> {
  const base = (process.env.LIBRETRANSLATE_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;
  const data = (await fetchJson(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: from,
      target: to,
      format: 'text',
      ...(process.env.LIBRETRANSLATE_KEY ? { api_key: process.env.LIBRETRANSLATE_KEY } : {}),
    }),
  })) as { translatedText?: string } | null;
  return usable(data?.translatedText, text);
}

async function viaGoogle(text: string, from: string, to: string): Promise<string | null> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const data = (await fetchJson(url)) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const joined = (data[0] as unknown[])
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('');
  return usable(joined, text);
}

async function viaMyMemory(text: string, from: string, to: string): Promise<string | null> {
  const de = process.env.MYMEMORY_EMAIL ? `&de=${encodeURIComponent(process.env.MYMEMORY_EMAIL)}` : '';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}${de}`;
  const data = (await fetchJson(url)) as { responseData?: { translatedText?: string }; responseStatus?: number | string } | null;
  if (!data || Number(data.responseStatus) !== 200) return null;
  return usable(data.responseData?.translatedText, text);
}

/** Translate one short text with the provider chain; returns null when every provider fails. */
async function translateChunk(text: string, from: string, to: string): Promise<string | null> {
  return (
    (await viaLibreTranslate(text, from, to)) ??
    (await viaGoogle(text, from, to)) ??
    (await viaMyMemory(text, from, to))
  );
}

/** Translate any text from one supported language to another; long texts are sentence-chunked. Never throws. */
export async function translateText(text: string, from: string, to: string): Promise<string> {
  const clean = text.trim();
  if (!clean || from === to) return text;
  try {
    if (clean.length <= 450) {
      return (await translateChunk(clean, from, to)) ?? clean;
    }
    const chunks = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [clean];
    const parts: string[] = [];
    for (const chunk of chunks) {
      const c = chunk.trim();
      if (!c) continue;
      parts.push((await translateChunk(c.slice(0, 450), from, to)) ?? c);
    }
    return parts.join(' ');
  } catch {
    return clean;
  }
}

/** Translate one field id->en (Indonesian input only; other text passes through). */
export async function translateIdToEn(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  if (!looksIndonesian(clean)) return clean;
  return translateText(clean, 'id', 'en');
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
