/*
 * Server-side translation for admin-saved content and the /api/translate
 * route used by the public site.
 *
 * Provider chain (first success wins):
 *   1. OpenRouter LLM, when OPENROUTER_API_KEY is set (Vercel env). Free
 *      models give near-human, context-aware translations for every
 *      language. OPENROUTER_MODEL overrides the primary model; a built-in
 *      fallback list rides along in the same request. Admin saves batch
 *      ALL fields into a single LLM call to stay well inside free-tier
 *      rate limits.
 *   2. LibreTranslate, when LIBRETRANSLATE_URL points at an instance
 *      (the self-hosted open-source option, no quota at all).
 *   3. Google Translate's free web endpoint (no key).
 *   4. MyMemory (no key; MYMEMORY_EMAIL raises the free daily quota).
 *
 * Every provider result passes an echo guard: an answer identical to the
 * input counts as a failure (some free services silently echo text back),
 * as does empty or HTML output. All failures are soft: callers fall back
 * to the original text, so a save or page view never breaks over
 * translation.
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

/* ---------------- shared helpers ---------------- */

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 7000): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', ...init });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

function usable(out: string | null | undefined, input: string): string | null {
  if (!out) return null;
  let clean = out.trim();
  if (!clean || clean.startsWith('<')) return null;
  // Models sometimes wrap the whole answer in quotes; strip one pair.
  if (clean.length > 1 && clean.startsWith('"') && clean.endsWith('"') && !input.trim().startsWith('"')) {
    clean = clean.slice(1, -1).trim();
  }
  if (!clean) return null;
  if (clean.toLowerCase() === input.trim().toLowerCase()) return null; // echo guard
  return clean;
}

const LANG_NAME: Record<string, string> = {
  en: 'English',
  id: 'Indonesian',
  ja: 'Japanese',
  ko: 'Korean',
  'zh-CN': 'Chinese (Simplified)',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ar: 'Arabic',
};

/* ---------------- OpenRouter (LLM, free models) ---------------- */

const OPENROUTER_FREE_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-26b-a4b-it:free',
];

function openRouterModels(): string[] | null {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const primary = process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_FREE_MODELS[0];
  return [primary, ...OPENROUTER_FREE_MODELS.filter((m) => m !== primary)];
}

async function openRouterChat(system: string, user: string): Promise<string | null> {
  const models = openRouterModels();
  const key = process.env.OPENROUTER_API_KEY;
  if (!models || !key) return null;
  const data = (await fetchJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'New-porto auto-translate',
      },
      body: JSON.stringify({
        models,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    },
    30000,
  )) as { choices?: { message?: { content?: string } }[] } | null;
  return data?.choices?.[0]?.message?.content ?? null;
}

async function viaOpenRouter(text: string, from: string, to: string): Promise<string | null> {
  const system =
    `You are a professional translator. Translate the user's text from ${LANG_NAME[from] ?? from} to ${LANG_NAME[to] ?? to}. ` +
    'Output ONLY the translation: no explanations, no notes, no quotation marks around it. ' +
    'Preserve names, brands, URLs, numbers, and line breaks exactly.';
  const out = await openRouterChat(system, text);
  return usable(out, text);
}

/**
 * Batch-translate Indonesian texts to English in ONE LLM call (admin save).
 * Returns an array aligned with the input: translated string, the original
 * for texts that are not Indonesian, or null where the model gave nothing
 * usable (the caller then falls back to the per-text provider chain).
 * Returns null when OpenRouter is not configured or the call fails.
 */
async function translateBatchIdEn(texts: string[]): Promise<(string | null)[] | null> {
  if (!openRouterModels()) return null;
  const todo = new Map<number, string>();
  texts.forEach((t, i) => {
    if (t.trim() && looksIndonesian(t)) todo.set(i, t);
  });
  const base: (string | null)[] = texts.map((t) => (t.trim() ? t : ''));
  if (todo.size === 0) return base;
  const payload: Record<string, string> = {};
  for (const [i, t] of todo) payload[String(i)] = t;
  const system =
    'You are a professional translator. Translate every value in the user\'s JSON object from Indonesian to English. ' +
    'Reply with ONLY a JSON object with the same keys and the translated values. No markdown fences, no explanations. ' +
    'Preserve names, brands, URLs, and numbers exactly.';
  const raw = await openRouterChat(system, JSON.stringify(payload));
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.replace(/```(?:json)?/g, '').trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
  const out = [...base];
  for (const [i] of todo) {
    const v = parsed[String(i)];
    out[i] = typeof v === 'string' ? usable(v, texts[i]) : null;
  }
  return out;
}

/* ---------------- other free providers ---------------- */

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

/* ---------------- public API ---------------- */

/** Translate one short text with the provider chain; returns null when every provider fails. */
async function translateChunk(text: string, from: string, to: string): Promise<string | null> {
  return (
    (await viaOpenRouter(text, from, to)) ??
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
  type Task = { text: string; apply: (value: string) => void };
  const tasks: Task[] = [];
  const collect = (text: string, apply: (value: string) => void) => tasks.push({ text, apply });

  for (const project of Object.values(meta.projects)) {
    collect(project.title ?? '', (v) => { project.titleEn = v; });
    collect(project.desc ?? '', (v) => { project.descEn = v; });
  }
  for (const cert of Object.values(meta.certificates)) {
    collect(typeof cert.title === 'string' ? cert.title : '', (v) => { cert.titleEn = v; });
    collect(typeof cert.desc === 'string' ? cert.desc : '', (v) => { cert.descEn = v; });
  }
  const profile = meta.profile as Profile & Record<string, unknown>;
  for (const field of PROFILE_TEXT_FIELDS) {
    const value = profile[field];
    if (typeof value === 'string') {
      collect(value, (v) => { profile[`${field}En`] = v; });
    }
  }
  if (Array.isArray(profile.roles)) {
    if (!Array.isArray(profile.rolesEn) || profile.rolesEn.length !== profile.roles.length) {
      profile.rolesEn = [...profile.roles];
    }
    profile.roles.forEach((role, idx) => {
      collect(role, (v) => {
        if (Array.isArray(profile.rolesEn)) profile.rolesEn[idx] = v;
      });
    });
  }

  // One batched LLM call when OpenRouter is configured; anything it misses
  // (and every field when it is not) goes through the per-text chain.
  const batch = await translateBatchIdEn(tasks.map((t) => t.text)).catch(() => null);
  await Promise.all(
    tasks.map(async (task, i) => {
      const fromBatch = batch?.[i];
      task.apply(fromBatch ?? (await translateIdToEn(task.text)));
    }),
  );
  return meta;
}
