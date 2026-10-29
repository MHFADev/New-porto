/*
 * Server-side translation for admin-saved content and the /api/translate
 * route used by the public site.
 *
 * Translation is done EXCLUSIVELY by OpenRouter LLM free models:
 * OPENROUTER_API_KEY (Vercel env) activates it, OPENROUTER_MODEL optionally
 * overrides the primary model, and a built-in list of free models rides
 * along as fallbacks in the same request. Admin saves batch ALL fields
 * into a single LLM call to stay well inside free-tier rate limits.
 *
 * There is deliberately no other provider: when OpenRouter is not
 * configured or a call fails, the original text is kept (soft failure, a
 * save or page view never breaks) and the detailed result reports why.
 */

const ID_WORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'adalah', 'ini', 'itu',
  'saya', 'aku', 'kami', 'kita', 'tidak', 'bisa', 'dapat', 'dalam', 'pada',
  'atau', 'juga', 'telah', 'akan', 'sebagai', 'oleh', 'sebuah', 'para',
  'menggunakan', 'berbasis', 'sistem', 'aplikasi', 'pengguna', 'layanan',
  'membantu', 'membangun', 'pengalaman', 'proyek', 'kerja', 'tahun', 'serta',
  'agar', 'lebih', 'saat', 'ketika', 'melalui', 'antara', 'setiap', 'semua',
  'sertifikat', 'jaringan', 'komputer', 'dasar', 'kelas', 'siswa', 'guru',
  'sekolah', 'manajemen', 'perangkat', 'lunak', 'teknologi', 'informasi',
  'kursus', 'pelatihan', 'akun', 'masuk', 'keluar', 'beranda', 'tentang',
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

/* ---------------- helpers ---------------- */

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

/* ---------------- OpenRouter (the only provider) ---------------- */

// OpenRouter accepts at most 3 entries in the fallback `models` array;
// sending 4 makes every request fail with HTTP 400 (verified in production).
// Pinned, translation-capable free models. The 'openrouter/free' auto-router
// is deliberately NOT used: in production it routed one request to a
// content-safety classifier that answered 'User Safety: safe' instead of
// translating. Gemma instruction models are strong at ID/EN/JP translation.
const OPENROUTER_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];

export function openRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function openRouterModels(): string[] | null {
  if (!openRouterConfigured()) return null;
  // FREE-ONLY, enforced in code: a configured model is honoured solely when it
  // is a ':free' variant, so this integration can never spend money. A paid
  // model id in OPENROUTER_MODEL is ignored; the pinned free model is used.
  const requested = process.env.OPENROUTER_MODEL?.trim();
  const primary = requested && requested.endsWith(':free') ? requested : OPENROUTER_FREE_MODELS[0];
  // OpenRouter rejects a fallback list longer than 3 with HTTP 400.
  return [primary, ...OPENROUTER_FREE_MODELS.filter((m) => m !== primary)].slice(0, 3);
}

export type ChatOutcome = {
  content: string | null;
  /** The model that actually answered, as reported by OpenRouter. */
  model: string | null;
  /** HTTP status of the OpenRouter call (0 = network failure / not called). */
  status: number;
  /** Short error detail when the call failed. */
  error: string | null;
};

async function openRouterChat(system: string, user: string): Promise<ChatOutcome> {
  const models = openRouterModels();
  const key = process.env.OPENROUTER_API_KEY;
  if (!models || !key) {
    return { content: null, model: null, status: 0, error: 'OPENROUTER_API_KEY is not set' };
  }
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.mhilmi.my.id',
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
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    });
  } catch (e) {
    return { content: null, model: null, status: 0, error: `network error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { content: null, model: null, status: res.status, error: body.slice(0, 300) || `HTTP ${res.status}` };
  }
  const data = (await res.json().catch(() => null)) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
  } | null;
  return {
    content: data?.choices?.[0]?.message?.content ?? null,
    model: data?.model ?? null,
    status: res.status,
    error: data?.choices?.[0]?.message?.content ? null : 'empty completion',
  };
}

const TRANSLATOR_SYSTEM = (from: string, to: string) =>
  `You are a professional translator. Translate the user's text from ${LANG_NAME[from] ?? from} to ${LANG_NAME[to] ?? to}. ` +
  'Output ONLY the translation: no explanations, no notes, no quotation marks around it. ' +
  'Preserve names, brands, URLs, numbers, and line breaks exactly.';

const TARGET_SCRIPT: Record<string, RegExp> = {
  ja: /[\u3040-\u30ff\u4e00-\u9faf]/,
  ko: /[\uac00-\ud7af]/,
  'zh-CN': /[\u4e00-\u9faf]/,
  ar: /[\u0600-\u06ff]/,
};

/** For script-distinct targets (ja/ko/zh/ar), a real translation must contain target-script characters. */
function scriptOk(out: string, to: string): boolean {
  const re = TARGET_SCRIPT[to];
  return !re || re.test(out);
}

export type TranslateOutcome = {
  text: string;
  provider: 'openrouter' | 'none';
  model: string | null;
  status: number;
  error: string | null;
};

/** Translate one short text via OpenRouter, reporting exactly what happened. */
export async function translateDetailed(text: string, from: string, to: string): Promise<TranslateOutcome> {
  const clean = text.trim();
  if (!clean || from === to) {
    return { text, provider: 'none', model: null, status: 0, error: null };
  }
  const r = await openRouterChat(TRANSLATOR_SYSTEM(from, to), clean);
  const out = usable(r.content, clean);
  if (out && !scriptOk(out, to)) {
    return { text: clean, provider: 'none', model: r.model, status: r.status, error: 'output not in target script' };
  }
  if (out) return { text: out, provider: 'openrouter', model: r.model, status: r.status, error: null };
  return { text: clean, provider: 'none', model: r.model, status: r.status, error: r.error ?? 'unusable output' };
}

/** Translate any text; long texts are sentence-chunked. Never throws. */
export async function translateText(text: string, from: string, to: string): Promise<string> {
  const clean = text.trim();
  if (!clean || from === to) return text;
  try {
    if (clean.length <= 450) {
      return (await translateDetailed(clean, from, to)).text;
    }
    const chunks = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [clean];
    const parts: string[] = [];
    for (const chunk of chunks) {
      const c = chunk.trim();
      if (!c) continue;
      parts.push((await translateDetailed(c.slice(0, 450), from, to)).text);
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

/**
 * Batch-translate Indonesian texts to English in ONE LLM call (admin save).
 * Returns an array aligned with the input: translated string, the original
 * for texts that are not Indonesian, or null where the model gave nothing
 * usable. Returns null when OpenRouter is not configured or the call fails.
 */
export async function translateBatchIdEnDetailed(
  texts: string[],
): Promise<{ results: (string | null)[]; model: string | null; status: number; error: string | null } | null> {
  if (!openRouterConfigured()) return null;
  const todo = new Map<number, string>();
  texts.forEach((t, i) => {
    if (t.trim() && looksIndonesian(t)) todo.set(i, t);
  });
  const base: (string | null)[] = texts.map((t) => (t.trim() ? t : ''));
  if (todo.size === 0) return { results: base, model: null, status: 0, error: null };
  const payload: Record<string, string> = {};
  for (const [i, t] of todo) payload[String(i)] = t;
  const system =
    'You are a professional translator. Translate every value in the user\'s JSON object from Indonesian to English. ' +
    'Reply with ONLY a JSON object with the same keys and the translated values. No markdown fences, no explanations. ' +
    'Preserve names, brands, URLs, and numbers exactly.';
  const r = await openRouterChat(system, JSON.stringify(payload));
  if (!r.content) return { results: base.map(() => null), model: r.model, status: r.status, error: r.error };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(r.content.replace(/```(?:json)?/g, '').trim()) as Record<string, unknown>;
  } catch {
    return { results: base.map(() => null), model: r.model, status: r.status, error: 'batch reply was not valid JSON' };
  }
  const out = [...base];
  for (const [i] of todo) {
    const v = parsed[String(i)];
    out[i] = typeof v === 'string' ? usable(v, texts[i]) : null;
  }
  return { results: out, model: r.model, status: r.status, error: null };
}

/* ---------------- admin save integration ---------------- */

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

  // One batched OpenRouter call for everything; any field it misses is
  // retried individually, and if OpenRouter is unavailable the original
  // text is kept (no other provider exists by design).
  const batch = await translateBatchIdEnDetailed(tasks.map((t) => t.text)).catch(() => null);
  await Promise.all(
    tasks.map(async (task, i) => {
      const fromBatch = batch?.results?.[i];
      task.apply(fromBatch ?? (await translateIdToEn(task.text)));
    }),
  );
  return meta;
}
