'use client';

import { useEffect, useState } from 'react';
import { LANG_OPTIONS, SUPPORTED, normalizeLang } from '@/lib/langs';

export { LANG_OPTIONS };

/*
 * UI dictionary: the site's chrome (nav, headings, buttons) in the two
 * first-class languages. Any other language is machine-translated from the
 * English entry at runtime (see useI18n / LocText) and cached locally.
 */
export const UI = {
  'nav.intro': { en: 'Intro', id: 'Intro' },
  'nav.more': { en: 'More', id: 'Lainnya' },
  'nav.about': { en: 'About', id: 'Tentang' },
  'nav.skills': { en: 'Skills', id: 'Keahlian' },
  'nav.activity': { en: 'Activity', id: 'Aktivitas' },
  'nav.certificates': { en: 'Certificates', id: 'Sertifikat' },
  'nav.work': { en: 'Work', id: 'Karya' },
  'nav.journey': { en: 'Journey', id: 'Perjalanan' },
  'nav.contact': { en: 'Contact', id: 'Kontak' },
  'cta.viewWork': { en: 'View my work', id: 'Lihat karya saya' },
  'cta.getInTouch': { en: 'Get in touch', id: 'Hubungi saya' },
  'hero.scroll': { en: 'Scroll to dive in', id: 'Scroll untuk masuk' },
  'hero.outro': {
    en: 'You made it to the screen. The work is one click away.',
    id: 'Kamu sampai di layarnya. Karyanya tinggal satu klik lagi.',
  },
  'about.kicker': { en: 'About', id: 'Tentang' },
  'about.title': { en: 'Infrastructure meets code.', id: 'Infrastruktur bertemu kode.' },
  'skills.kicker': { en: 'Capabilities', id: 'Kemampuan' },
  'skills.title': { en: 'A toolkit built for reliability.', id: 'Perangkat yang dibangun untuk keandalan.' },
  'activity.kicker': { en: 'GitHub activity', id: 'Aktivitas GitHub' },
  'activity.title': {
    en: 'Built in public, one commit at a time.',
    id: 'Dibangun di depan publik, satu commit demi satu commit.',
  },
  'certs.kicker': { en: 'Credentials', id: 'Kredensial' },
  'certs.title': { en: 'Proof behind the practice.', id: 'Bukti di balik praktik.' },
  'projects.kicker': { en: 'Selected work', id: 'Karya pilihan' },
  'projects.title': { en: "Things I've shipped, lately.", id: 'Yang sudah saya rilis belakangan ini.' },
  'contact.kicker': { en: 'Contact', id: 'Kontak' },
  'contact.title': { en: "Let's build something solid.", id: 'Mari bangun sesuatu yang kokoh.' },
  'lang.auto': { en: 'Auto (region)', id: 'Otomatis (region)' },
} as const;

export type UiKey = keyof typeof UI;

const CHOICE_KEY = 'pf-lang-choice';
const MT_CACHE_KEY = 'pf-mt-cache-v1';

/* ---------- machine translation (via /api/translate, OpenRouter) ---------- */

type MtCache = Record<string, string>;
let mtCache: MtCache | null = null;
const inflight = new Map<string, Promise<string>>();

function loadCache(): MtCache {
  if (mtCache) return mtCache;
  try {
    mtCache = JSON.parse(localStorage.getItem(MT_CACHE_KEY) ?? '{}') as MtCache;
  } catch {
    mtCache = {};
  }
  return mtCache;
}

function saveCache() {
  try {
    localStorage.setItem(MT_CACHE_KEY, JSON.stringify(mtCache ?? {}));
  } catch {
    /* storage full/blocked: translations simply re-fetch next time */
  }
}

export function mtTranslate(text: string, target: string, source: 'en' | 'id' = 'en'): Promise<string> {
  const clean = text.trim();
  if (!clean || target === source) return Promise.resolve(text);
  const key = `${source}|${target}|${clean}`;
  const cache = loadCache();
  if (cache[key]) return Promise.resolve(cache[key]);
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = (async () => {
    try {
      let out: string | null = null;
      // The site's own /api/translate route, powered by OpenRouter LLM
      // free models on the server. Failures keep the original text.
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean.slice(0, 480), from: source, to: target }),
        });
        if (res.ok) {
          const data = (await res.json()) as { text?: string };
          const t = data.text?.trim();
          if (t && t.toLowerCase() !== clean.toLowerCase()) out = t;
        }
      } catch {
        /* fall through to the direct provider below */
      }
      if (!out) return text;
      cache[key] = out;
      saveCache();
      return out;
    } catch {
      return text;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

/* ---------- language state ---------- */

export type I18n = {
  /** Resolved language actually displayed. */
  lang: string;
  /** What the visitor picked in the switcher: 'auto' or a language code. */
  choice: string;
  setChoice: (choice: string) => void;
  /** Synchronous UI-string resolver (en/id built in, others MT-cached). */
  tx: (key: UiKey) => string;
};

export function useI18n(): I18n {
  const [choice, setChoiceState] = useState<string>('auto');
  const [detected, setDetected] = useState<string>('en');
  const [mtDict, setMtDict] = useState<Record<string, string>>({});

  // Resolve the region language once: saved choice, then Vercel country
  // header via /api/locale, then the browser language.
  useEffect(() => {
    let dead = false;
    const saved = (() => {
      try {
        return localStorage.getItem(CHOICE_KEY);
      } catch {
        return null;
      }
    })();
    if (saved && (saved === 'auto' || SUPPORTED.has(saved))) setChoiceState(saved);
    (async () => {
      try {
        const res = await fetch('/api/locale');
        const data = (await res.json()) as { lang?: string | null };
        if (!dead && data.lang && SUPPORTED.has(data.lang)) {
          setDetected(data.lang);
          return;
        }
      } catch {
        /* fall through to browser language */
      }
      if (!dead) setDetected(normalizeLang(navigator.language));
    })();
    return () => {
      dead = true;
    };
  }, []);

  const lang = choice === 'auto' ? detected : choice;

  // For MT languages, translate the whole UI dictionary once per language.
  useEffect(() => {
    if (lang === 'en' || lang === 'id') return;
    let dead = false;
    (async () => {
      const entries = Object.entries(UI) as [UiKey, { en: string; id: string }][];
      const results = await Promise.all(entries.map(async ([key, value]) => [key, await mtTranslate(value.en, lang, 'en')] as const));
      if (!dead) setMtDict(Object.fromEntries(results));
    })();
    return () => {
      dead = true;
    };
  }, [lang]);

  const setChoice = (next: string) => {
    setChoiceState(next);
    try {
      localStorage.setItem(CHOICE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const tx = (key: UiKey): string => {
    const entry = UI[key];
    if (lang === 'id') return entry.id;
    if (lang === 'en') return entry.en;
    return mtDict[key] ?? entry.en;
  };

  return { lang, choice, setChoice, tx };
}

/* ---------- localized content text ---------- */

/**
 * Renders a content string in the visitor's language.
 * idText: the text as the owner typed it (Indonesian source).
 * enText: the English version generated on save in the admin panel.
 * Other languages are machine-translated from English on the fly.
 */
export function LocText({ idText, enText, lang }: { idText: string; enText?: string; lang: string }) {
  const base = lang === 'id' ? idText : enText || idText;
  const [out, setOut] = useState(base);
  useEffect(() => {
    setOut(base);
    if (lang === 'en' || lang === 'id' || !base.trim()) return;
    let dead = false;
    mtTranslate(base, lang, enText ? 'en' : 'id').then((value) => {
      if (!dead) setOut(value);
    });
    return () => {
      dead = true;
    };
  }, [base, lang, enText]);
  return <>{out}</>;
}
