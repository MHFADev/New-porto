/*
 * Language metadata shared by the server (region detection route) and the
 * client (language switcher, translation layer). No React in here.
 */

export type LangOption = { code: string; label: string };

/** Languages the switcher offers. 'auto' means: follow the visitor's region. */
export const LANG_OPTIONS: LangOption[] = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
];

export const SUPPORTED = new Set(LANG_OPTIONS.map((l) => l.code));

/** ISO country (from Vercel's x-vercel-ip-country) -> site language. */
export const COUNTRY_LANG: Record<string, string> = {
  ID: 'id',
  JP: 'ja',
  KR: 'ko',
  CN: 'zh-CN',
  TW: 'zh-CN',
  HK: 'zh-CN',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  FR: 'fr',
  BE: 'fr',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  BR: 'pt',
  PT: 'pt',
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  QA: 'ar',
  MY: 'id',
  SG: 'en',
};

/** Normalize a browser language tag ('id-ID', 'en-US', 'zh-TW') to a supported code. */
export function normalizeLang(raw: string | null | undefined): string {
  if (!raw) return 'en';
  const tag = raw.trim();
  if (/^zh/i.test(tag)) return 'zh-CN';
  const primary = tag.toLowerCase().split('-')[0];
  return SUPPORTED.has(primary) ? primary : 'en';
}
