'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import type { RefObject } from 'react';
import type { CSSProperties, ReactNode, SVGProps } from 'react';
import { animate, onScroll, stagger } from 'animejs';
import type { JSAnimation, ScrollObserver } from 'animejs';
import { DEFAULT_PROFILE } from '@/lib/profile';
import type { Profile } from '@/lib/profile';
import PhysicsWrapper from '@/components/PhysicsWrapper';
import ScrollHero from '@/components/ScrollHero';
import { useI18n, LocText, LANG_OPTIONS } from '@/lib/i18n';
import type { I18n, UiKey } from '@/lib/i18n';

const NAV: { label: string; key: UiKey; href: string }[] = [
  { label: 'About', key: 'nav.about', href: '#about' },
  { label: 'Skills', key: 'nav.skills', href: '#skills' },
  { label: 'Activity', key: 'nav.activity', href: '#contributions' },
  { label: 'Certificates', key: 'nav.certificates', href: '#certificates' },
  { label: 'Work', key: 'nav.work', href: '#projects' },
  { label: 'Journey', key: 'nav.journey', href: '#story' },
  { label: 'Contact', key: 'nav.contact', href: '#contact' },
];

const MARQUEE_ITEMS = [
  'IT Support',
  'Network Administration',
  'Next.js',
  'TypeScript',
  'Python',
  'Tailwind CSS',
  'Docker',
  'Linux',
  'PostgreSQL',
  'System Maintenance',
];

const SKILLS = [
  {
    group: { en: 'Infrastructure', id: 'Infrastruktur' },
    icon: <LayersIcon className="w-5 h-5" />,
    items: [{ en: 'IT Support & Troubleshooting', id: 'Dukungan IT & Pemecahan Masalah' }, { en: 'Network Administration', id: 'Administrasi Jaringan' }, { en: 'System Maintenance', id: 'Perawatan Sistem' }, { en: 'Hardware Diagnostics', id: 'Diagnostik Perangkat Keras' }],
  },
  {
    group: { en: 'Languages', id: 'Bahasa Pemrograman' },
    icon: <CodeIcon className="w-5 h-5" />,
    items: ['Next.js / TypeScript', 'JavaScript', 'Python', 'HTML / CSS', 'Tailwind CSS'],
  },
  {
    group: { en: 'Tools', id: 'Alat' },
    icon: <WrenchIcon className="w-5 h-5" />,
    items: ['Git / GitHub', 'Docker', 'Linux / Windows Server', 'PostgreSQL / MySQL'],
  },
];

const STATS = [
  { to: 6, suffix: '+', label: 'Years in IT' },
  { to: 2, suffix: '+', label: 'Projects shipped' },
  { to: 14, suffix: '+', label: 'Technologies' },
  { to: 24, suffix: '/7', label: 'Support uptime' },
];

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clampTo = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Runs `callback` at most once per animation frame while the page scrolls or resizes. */
function useScrollFrame(callback: () => void, enabled: boolean) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const run = () => {
      raf = 0;
      callbackRef.current();
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      cancelAnimationFrame(raf);
      callbackRef.current(); // settle on the final scroll position when switched off
    };
  }, [enabled]);
}

/** True while the element is within `margin` of the viewport, so scroll effects can sleep elsewhere. */
function useNearViewport(ref: RefObject<Element | null>, margin = '40% 0px') {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}

function CinematicLoader({ reduced, profile, onComplete, lang }: { reduced: boolean; profile: Profile; onComplete: () => void; lang: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let live = true;
    let raf = 0;
    let value = 0;
    let resourcesReady = false;
    let finishing = false;
    const started = performance.now();
    const minimum = reduced ? 180 : 750;
    const fontsReady = 'fonts' in document ? document.fonts.ready.then(() => undefined) : Promise.resolve();
    fontsReady.then(() => { resourcesReady = true; }, () => { resourcesReady = true; });

    const onPointerMove = (event: PointerEvent) => {
      if (reduced) return;
      overlay.style.setProperty('--loader-x', `${event.clientX}px`);
      overlay.style.setProperty('--loader-y', `${event.clientY}px`);
      overlay.style.setProperty('--loader-shift-x', `${((event.clientX / window.innerWidth) - 0.5) * 18}px`);
      overlay.style.setProperty('--loader-shift-y', `${((event.clientY / window.innerHeight) - 0.5) * 18}px`);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const finish = () => {
      if (!live || finishing) return;
      finishing = true;
      cancelAnimationFrame(raf);
      setProgress(100);
      if (reduced) {
        document.body.style.overflow = previousOverflow;
        onComplete();
        return;
      }
      animate(overlay.querySelectorAll<HTMLElement>('[data-loader-piece]'), {
        opacity: [1, 0],
        translateY: [0, -32],
        duration: 480,
        delay: stagger(45),
        ease: 'inQuad',
      });
      animate(overlay, {
        translateY: ['0%', '-105%'],
        duration: 1050,
        delay: 260,
        ease: 'inOutExpo',
        onComplete: () => {
          if (!live) return;
          document.body.style.overflow = previousOverflow;
          onComplete();
        },
      });
    };

    const tick = (now: number) => {
      if (!live) return;
      const elapsed = now - started;
      const everythingReady = resourcesReady;
      const ceiling = everythingReady ? 100 : 92;
      const target = Math.min(ceiling, (elapsed / minimum) * 100);
      value += (target - value) * 0.085;
      if (everythingReady && elapsed >= minimum) value += (100 - value) * 0.18;
      setProgress(Math.min(99, Math.floor(value)));
      if (everythingReady && elapsed >= minimum && value > 97.8) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const failsafe = window.setTimeout(() => {
      resourcesReady = true;
      finish();
    }, 3200);

    return () => {
      live = false;
      cancelAnimationFrame(raf);
      clearTimeout(failsafe);
      window.removeEventListener('pointermove', onPointerMove);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete, reduced]);

  return (
    <div ref={overlayRef} className="cinematic-loader fixed inset-0 z-[100] overflow-hidden bg-surface-dim text-cotton" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Loading portfolio">
      <div className="loader-grid absolute inset-0" aria-hidden="true" />
      <div className="loader-cursor-glow" aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-10">
        <div data-loader-piece className="flex items-center justify-between font-mono text-[10px] font-bold tracking-[.22em] text-on-surface-variant">
          <span>{profile.shortName.toUpperCase()} / PORTFOLIO</span><span>{profile.locationShort.toUpperCase()}</span>
        </div>
        <div className="loader-center mx-auto w-full max-w-6xl">
          <p data-loader-piece className="mb-5 font-mono text-[10px] font-bold tracking-[.26em] text-cyan sm:text-xs"><LocText idText="MENYIAPKAN PENGALAMAN ANDA" enText="CRAFTING YOUR EXPERIENCE" lang={lang} /></p>
          <div data-loader-piece className="loader-signal relative">
            <div className="loader-signal-ring loader-signal-ring-a" aria-hidden="true" />
            <div className="loader-signal-ring loader-signal-ring-b" aria-hidden="true" />
            <div className="loader-monogram" aria-hidden="true"><span>M</span><i>H</i></div>
            <span className="loader-chip loader-chip-a">DESIGN</span>
            <span className="loader-chip loader-chip-b">CODE</span>
            <span className="loader-chip loader-chip-c">SYSTEMS</span>
          </div>
          <div data-loader-piece className="mt-2 flex items-end justify-between gap-5">
            <p className="max-w-xs font-mono text-[9px] font-bold leading-relaxed tracking-[.18em] text-on-surface-variant sm:text-[10px]">{lang === 'id' ? <>GERAKKAN KURSOR<br />ANTARMUKA SEDANG MENDENGARKAN</> : <>MOVE YOUR CURSOR<br />THE INTERFACE IS LISTENING</>}</p>
            <div className="text-right">
              <p className="mb-1 font-mono text-[9px] font-bold tracking-[.22em] text-on-surface-variant">{lang === 'id' ? 'MEMUAT' : 'LOADING'}</p>
              <div className="font-display text-[clamp(3.6rem,10vw,8rem)] font-black leading-[.72] tracking-[-.07em] tabular-nums">{String(progress).padStart(2, '0')}<span className="text-[.3em] text-yellow">%</span></div>
            </div>
          </div>
          <div data-loader-piece className="mt-7 h-2 overflow-hidden rounded-full border-2 border-ink bg-cotton shadow-[4px_5px_0_var(--color-ink)]">
            <div className="h-full origin-left bg-lime transition-transform duration-100" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
        </div>
        <div data-loader-piece className="flex items-center justify-between font-mono text-[10px] font-bold tracking-[.16em] text-on-surface-variant">
          <span>IT SUPPORT × FULL-STACK</span><span className="flex items-center gap-2 text-active"><i className="loader-status-dot" /> <LocText idText="SISTEM ONLINE" enText="SYSTEMS ONLINE" lang={lang} /></span>
        </div>
      </div>
    </div>
  );
}

// ponytail: tiny Lenis-style lerp on fine pointers; native scroll elsewhere. Rung 5 — no new dep.
function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return;
    const html = document.documentElement;
    html.style.scrollBehavior = 'auto';
    let target = window.scrollY;
    let cur = window.scrollY;
    let raf = 0;
    let running = false;

    let lastFrame = 0;
    // Frame-rate independent ease (≈ the old 0.12-per-frame feel at 60Hz, same on 120/144Hz screens).
    const tick = (now: number) => {
      running = false;
      const dt = lastFrame ? Math.min(64, now - lastFrame) : 16.7;
      lastFrame = now;
      cur += (target - cur) * (1 - Math.exp(-dt / 130));
      if (Math.abs(target - cur) < 0.4) cur = target;
      window.scrollTo(0, cur);
      if (Math.abs(target - cur) > 0.4) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else {
        lastFrame = 0;
      }
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const onWheel = (e: WheelEvent) => {
      // Leave pinch/ctrl-zoom and sideways gestures to the browser.
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      // Firefox reports wheel notches in lines (deltaMode 1), not pixels.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const max = html.scrollHeight - window.innerHeight;
      target = Math.min(max, Math.max(0, target + e.deltaY * unit));
      start();
    };
    const onNativeScroll = () => {
      if (!running) {
        target = window.scrollY;
        cur = window.scrollY;
        return;
      }
      // A scroll we didn't cause (scrollTo, keyboard, scrollbar drag): yield to it instead of fighting.
      if (Math.abs(window.scrollY - cur) > 2) {
        cancelAnimationFrame(raf);
        running = false;
        lastFrame = 0;
        target = window.scrollY;
        cur = window.scrollY;
      }
    };
    const onAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href')!;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
      start();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onNativeScroll, { passive: true });
    window.addEventListener('click', onAnchorClick, { capture: true });
    return () => {
      html.style.scrollBehavior = '';
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onNativeScroll);
      window.removeEventListener('click', onAnchorClick, { capture: true } as EventListenerOptions);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return null;
}

function ScrollMomentum() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const root = document.documentElement;
    let last = window.scrollY;
    let velocity = 0;
    let raf = 0;
    const frame = () => {
      velocity *= 0.86;
      root.style.setProperty('--scroll-v', velocity.toFixed(2));
      if (Math.abs(velocity) > 0.02) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    const onScroll = () => {
      const next = window.scrollY;
      velocity = Math.max(-12, Math.min(12, velocity + (next - last) * 0.16));
      last = next;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      root.style.removeProperty('--scroll-v');
    };
  }, [reduced]);

  return null;
}

function Tilt({
  children,
  className,
  max = 9,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || window.matchMedia('(hover: none)').matches) return;
    let raf = 0;
    const cur = { x: 0, y: 0 };
    const goal = { x: 0, y: 0 };
    const loop = () => {
      raf = 0;
      cur.x += (goal.x - cur.x) * 0.14;
      cur.y += (goal.y - cur.y) * 0.14;
      el.style.transform = `perspective(900px) rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
      if (Math.abs(goal.x - cur.x) > 0.05 || Math.abs(goal.y - cur.y) > 0.05) {
        raf = requestAnimationFrame(loop);
      }
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      goal.x = -((e.clientY - r.top) / r.height - 0.5) * max;
      goal.y = ((e.clientX - r.left) / r.width - 0.5) * max;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      goal.x = 0;
      goal.y = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [max, reduced]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}

function SplitWords({
  text,
  className,
  gradientWords = [],
  delay = 0,
}: {
  text: string;
  className?: string;
  gradientWords?: string[];
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLElement>('[data-w]'));
    if (reduced) {
      spans.forEach((s) => {
        s.style.opacity = '1';
        s.style.transform = 'none';
      });
      return;
    }
    let anim: JSAnimation | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !anim) {
          anim = animate(spans, {
            opacity: [0, 1],
            translateY: ['110%', '0%'],
            duration: 900,
            delay: stagger(40, { start: delay }),
            ease: 'outExpo',
          });
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.pause();
    };
  }, [delay, reduced]);

  const clean = (w: string) => w.replace(/[^a-zA-Z0-9'-]/g, '');

  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <span
            data-w
            aria-hidden="true"
            className={`inline-block will-change-transform ${
              gradientWords.includes(clean(w)) ? 'text-gradient' : ''
            }`}
          >
            {w}
            {'\u00A0'}
          </span>
        </span>
      ))}
    </span>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
  y = 48,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.opacity = '1';
      return;
    }
    let anim: JSAnimation | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        anim?.pause();
        if (entry.isIntersecting) {
          anim = animate(el, {
            opacity: 1,
            translateY: 0,
            duration: 1000,
            delay,
            ease: 'outExpo',
          });
        } else {
          anim = animate(el, {
            opacity: 0,
            translateY: entry.boundingClientRect.top < 0 ? -y * 0.45 : y * 0.65,
            duration: 520,
            delay: 0,
            ease: 'inOutQuad',
          });
        }
      },
      { threshold: 0, rootMargin: '-7% 0px -7% 0px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.pause();
    };
  }, [delay, y, reduced]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, ...style }}>
      {children}
    </div>
  );
}

function RevealGroup({
  children,
  className,
  y = 48,
  staggerMs = 90,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  staggerMs?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.children).filter((c) =>
      (c as HTMLElement).classList.contains('reveal-item')
    );
    if (reduced) {
      items.forEach((c) => {
        (c as HTMLElement).style.opacity = '1';
      });
      return;
    }
    if (!items.length) return;
    let anim: JSAnimation | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        anim?.pause();
        if (entry.isIntersecting) {
          anim = animate(items, {
            opacity: 1,
            translateY: 0,
            duration: 900,
            delay: stagger(staggerMs, { start: delay }),
            ease: 'outExpo',
          });
        } else {
          anim = animate(items, {
            opacity: 0,
            translateY: entry.boundingClientRect.top < 0 ? -y * 0.35 : y * 0.5,
            duration: 450,
            delay: stagger(25),
            ease: 'inOutQuad',
          });
        }
      },
      { threshold: 0, rootMargin: '-6% 0px -6% 0px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.pause();
    };
  }, [y, staggerMs, delay, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(hover: none)').matches) return;
    let ax: JSAnimation | null = null;
    let ay: JSAnimation | null = null;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      ax?.pause();
      ay?.pause();
      ax = animate(el, { translateX: x, duration: 500, ease: 'outQuad' });
      ay = animate(el, { translateY: y, duration: 500, ease: 'outQuad' });
    };
    const onLeave = () => {
      ax?.pause();
      ay?.pause();
      ax = animate(el, { translateX: 0, duration: 800, ease: 'outElastic' });
      ay = animate(el, { translateY: 0, duration: 800, ease: 'outElastic' });
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      ax?.pause();
      ay?.pause();
    };
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function Counter({
  to,
  suffix = '',
  decimals = 0,
  duration = 1800,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = to.toFixed(decimals) + suffix;
      return;
    }
    const obj = { v: 0 };
    let anim: JSAnimation | null = null;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started) return;
        started = true;
        anim = animate(obj, {
          v: to,
          duration,
          ease: 'outExpo',
          onUpdate: () => {
            el.textContent = obj.v.toFixed(decimals) + suffix;
          },
        });
        io.disconnect();
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.pause();
    };
  }, [to, suffix, decimals, duration, reduced]);

  return <span ref={ref}>0</span>;
}

function RoleRotator({ roles }: { roles: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) return;
    let i = 0;
    let anim: JSAnimation | null = null;
    const id = setInterval(() => {
      const next = roles[(i + 1) % roles.length];
      anim?.pause();
      anim = animate(el, {
        opacity: [1, 0],
        translateY: [0, -12],
        duration: 300,
        ease: 'inQuad',
        onComplete: () => {
          el.textContent = next;
          anim = animate(el, {
            opacity: [0, 1],
            translateY: [12, 0],
            duration: 500,
            ease: 'outExpo',
          });
        },
      });
      i++;
    }, 3000);
    return () => {
      clearInterval(id);
      anim?.pause();
    };
  }, [roles, reduced]);

  return <span ref={ref}>{roles[0]}</span>;
}

function Marquee({ items }: { items: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (reduced) return;
    const anim = animate(track, {
      translateX: ['0%', '-50%'],
      duration: 28000,
      ease: 'linear',
      loop: true,
    });
    return () => {
      anim.pause();
    };
  }, [reduced]);

  const row = [...items, ...items];

  return (
    <div
      className="relative border-y border-line-strong bg-surface-container/40 py-5 overflow-hidden mask-x select-none"
      aria-hidden="true"
    >
      <div ref={trackRef} className="flex w-max">
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-8 pr-8 text-sm sm:text-base font-medium text-on-surface-variant/80 whitespace-nowrap"
          >
            {item}
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container/70" />
          </span>
        ))}
      </div>
    </div>
  );
}

function SmartImage({
  src,
  alt,
  className,
  fallback,
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  loading?: 'lazy' | 'eager';
}) {
  const [loadedSrc, setLoadedSrc] = useState('');
  const [failedSrc, setFailedSrc] = useState('');
  const status = failedSrc === src ? 'error' : loadedSrc === src ? 'ok' : 'loading';

  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }
  return (
    <div className={`${className ?? ''} ${status === 'loading' ? 'image-skeleton' : ''}`}>
      {/* Runtime GitHub proxy URLs are not static Next image assets; keep them browser-native. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className="absolute inset-0 h-full w-full object-cover image-loaded"
      />
    </div>
  );
}

function CursorSpotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || window.matchMedia('(hover: none)').matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
      el.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [reduced]);

  return (
    <div ref={ref} className={`spotlight-card ${className ?? ''}`}>
      {children}
    </div>
  );
}

function FlipText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-flip]'));
    let anim: JSAnimation | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !anim) {
          anim = animate(chars, {
            rotateX: [90, 0],
            opacity: [0, 1],
            duration: 700,
            delay: stagger(22, { start: delay }),
            ease: 'outExpo',
          });
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.pause();
    };
  }, [delay, reduced]);

  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden"
          style={{ perspective: '600px' }}
        >
          <span
            data-flip
            aria-hidden="true"
            className="inline-block will-change-transform"
            style={{ opacity: reduced ? 1 : 0, transformOrigin: 'bottom' }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        </span>
      ))}
    </span>
  );
}

function AnimatedRays({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-40 ${className ?? ''}`}
      aria-hidden="true"
      style={{
        background:
          'conic-gradient(from 180deg at 50% 50%, transparent 0deg, color-mix(in srgb, var(--color-primary-container) 18%, transparent) 15deg, transparent 30deg, color-mix(in srgb, var(--color-secondary) 14%, transparent) 45deg, transparent 60deg, color-mix(in srgb, var(--color-primary-container) 18%, transparent) 75deg, transparent 90deg, color-mix(in srgb, var(--color-secondary) 14%, transparent) 105deg, transparent 120deg)',
        animation: 'rays-spin 28s linear infinite',
        maskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, #000 25%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, #000 25%, transparent 70%)',
      }}
    />
  );
}

function SectionHeading({
  index,
  kicker,
  title,
  gradient = [],
  useFlip = false,
}: {
  index: string;
  kicker: string;
  title: string;
  gradient?: string[];
  useFlip?: boolean;
}) {
  return (
    <Reveal className="mb-14 sm:mb-20">
      <div>
        <div className="flex items-center gap-4 font-mono text-xs font-bold tracking-[0.25em] uppercase text-on-surface-variant/70 mb-5">
          <span className="section-index">{index}</span>
          <span>{kicker}</span>
          <span className="h-[2px] flex-1 bg-line-strong" />
        </div>
        <h2 className="font-display font-black tracking-[-0.045em] text-cotton text-4xl sm:text-6xl leading-[.98] max-w-3xl">
          {useFlip ? (
            <FlipText text={title} />
          ) : (
            <SplitWords text={title} gradientWords={gradient} />
          )}
        </h2>
      </div>
    </Reveal>
  );
}

/** Manual language switcher: a globe button with a dropdown. The choice
 *  overrides region detection and is remembered on the visitor's device. */
function LangButton({ i18n }: { i18n: I18n }) {
  const [open, setOpen] = useState(false);
  const current = i18n.choice === 'auto'
    ? i18n.tx('lang.auto')
    : (LANG_OPTIONS.find((o) => o.code === i18n.choice)?.label ?? i18n.choice);
  const pick = (value: string) => {
    i18n.setChoice(value);
    setOpen(false);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="flex h-10 items-center gap-2 rounded-full border border-line-strong px-3 text-sm text-on-surface-variant transition-colors hover:text-cotton"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3Z" />
        </svg>
        <span className="hidden max-w-[7.5rem] truncate sm:inline">{current}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" aria-label="Language" className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-line-strong bg-surface-container p-1.5 shadow-2xl">
            <button
              type="button"
              role="option"
              aria-selected={i18n.choice === 'auto'}
              onClick={() => pick('auto')}
              className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-white/5 ${i18n.choice === 'auto' ? 'font-bold text-cyan' : 'text-on-surface-variant'}`}
            >
              <span>{i18n.tx('lang.auto')}</span>
              {i18n.choice === 'auto' ? <span aria-hidden="true">✓</span> : null}
            </button>
            {LANG_OPTIONS.map((o) => (
              <button
                key={o.code}
                type="button"
                role="option"
                aria-selected={i18n.choice === o.code}
                onClick={() => pick(o.code)}
                className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-white/5 ${i18n.choice === o.code ? 'font-bold text-cyan' : 'text-on-surface-variant'}`}
              >
                <span>{o.label}</span>
                {i18n.choice === o.code ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Navbar({ theme, onToggle, i18n }: { theme: string; onToggle: () => void; i18n: I18n }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState('');
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const reduced = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 160);
      setScrolled(y > 24);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    if (reduced) {
      el.style.opacity = '1';
      return;
    }
    const anim = animate(el, {
      translateY: [-80, 0],
      opacity: [0, 1],
      duration: 900,
      delay: 250,
      ease: 'outExpo',
    });
    return () => {
      anim.pause();
    };
  }, [reduced]);

  const MAIN_HREFS = ['#about', '#skills', '#projects', '#story', '#contact'];
  const mainLinks = NAV.filter((n) => MAIN_HREFS.includes(n.href));
  const moreLinks = NAV.filter((n) => !MAIN_HREFS.includes(n.href));
  const linkCls = (href: string) =>
    `rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
      active === href.slice(1) ? 'bg-white/10 text-cotton' : 'text-on-surface-variant hover:bg-white/5 hover:text-cotton'
    }`;

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-4 z-50 flex justify-center px-4 transition-transform duration-500 ${
          hidden && !open ? '-translate-y-[160%]' : 'translate-y-0'
        }`}
      >
        <div
          className={`flex h-14 w-full max-w-[920px] items-center gap-2 rounded-full border border-white/10 bg-surface/70 px-3 backdrop-blur-[16px] transition-shadow duration-500 ${
            scrolled ? 'shadow-[0_22px_55px_-18px_rgba(0,0,0,0.7)]' : 'shadow-[0_14px_40px_-18px_rgba(0,0,0,0.55)]'
          }`}
        >
          <a href="#top" className="brand-badge font-display font-black text-lg text-ink tracking-tight">
            hilmi<span>.</span>
            <span className="hidden sm:inline font-mono text-[10px] font-normal text-on-surface-variant/60 ml-2">
              my.id
            </span>
          </a>

          <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
            {mainLinks.map((item) => (
              <a key={item.href} href={item.href} className={linkCls(item.href)}>
                {i18n.tx(item.key)}
              </a>
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={moreOpen}
                className={`inline-flex items-center gap-1.5 ${linkCls('#more')}`}
              >
                {i18n.tx('nav.more')}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {moreOpen ? (
                <>
                  <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-52 rounded-2xl border border-white/10 bg-surface/95 p-2 shadow-2xl backdrop-blur-[16px]">
                    {moreLinks.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 text-sm transition-colors hover:bg-white/5 ${
                          active === item.href.slice(1) ? 'font-bold text-primary-container' : 'text-on-surface-variant'
                        }`}
                      >
                        {i18n.tx(item.key)}
                        <span className="font-mono text-[10px] text-on-surface-variant/50" aria-hidden="true">→</span>
                      </a>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <LangButton i18n={i18n} />
            <button
              onClick={onToggle}
              aria-label="Toggle color theme"
              className="w-10 h-10 rounded-full border border-line-strong flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:border-primary-container/50 transition-colors"
            >
              {theme === 'dark' ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
            </button>
            <a
              href="#contact"
              className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-yellow text-ink px-4 text-sm font-black shadow-[3px_4px_0_var(--color-ink)] hover:-translate-y-0.5 transition-transform"
            >
              <LocText idText="Rekrut saya" enText="Hire me" lang={i18n.lang} />
            </a>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="lg:hidden w-10 h-10 rounded-full border border-line-strong flex items-center justify-center text-on-surface-variant"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-surface/95 backdrop-blur-2xl lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-20 items-center justify-between px-5">
            <a href="#top" onClick={() => setOpen(false)} className="brand-badge font-display font-black text-lg text-ink tracking-tight">
              hilmi<span>.</span>
            </a>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="w-11 h-11 rounded-full border border-line-strong flex items-center justify-center text-cotton"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col overflow-y-auto px-6 py-2" aria-label="Menu">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between py-4 text-3xl font-display font-black tracking-tight border-b border-line ${
                  active === item.href.slice(1) ? 'text-primary-container' : 'text-cotton'
                }`}
              >
                {i18n.tx(item.key)}
                <span className="font-mono text-sm text-on-surface-variant/50" aria-hidden="true">→</span>
              </a>
            ))}
          </nav>
          <div className="px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="flex h-[52px] items-center justify-center rounded-full border-2 border-ink bg-yellow text-ink font-display text-base font-black shadow-[4px_5px_0_var(--color-ink)]"
            >
              <LocText idText="Rekrut saya" enText="Hire me" lang={i18n.lang} />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Decorative sticker you can pick up and throw; it springs back to its spot. Fine pointers only. */
function DragSticker({ className, children, reduced }: { className: string; children: ReactNode; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    el.dataset.drag = 'true';
    const pos = { x: 0, y: 0 };
    let tilt = 0;
    let anim: JSAnimation | null = null;
    let origin = { px: 0, py: 0, x: 0, y: 0 };
    let grabbed = false;

    const apply = () => {
      el.style.setProperty('--dx', `${pos.x.toFixed(1)}px`);
      el.style.setProperty('--dy', `${pos.y.toFixed(1)}px`);
      el.style.setProperty('--dr', `${tilt.toFixed(2)}deg`);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      anim?.pause();
      grabbed = true;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = 'true';
      origin = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    };
    const onMove = (e: PointerEvent) => {
      if (!grabbed) return;
      const nx = clampTo(origin.x + e.clientX - origin.px, -420, 420);
      const ny = clampTo(origin.y + e.clientY - origin.py, -420, 420);
      tilt = clampTo((nx - pos.x) * 0.7, -14, 14); // lean into the movement
      pos.x = nx;
      pos.y = ny;
      apply();
    };
    const onUp = () => {
      if (!grabbed) return;
      grabbed = false;
      delete el.dataset.dragging;
      anim = animate(pos, {
        x: 0,
        y: 0,
        duration: reduced ? 220 : 950,
        ease: reduced ? 'outQuad' : 'outElastic(1, .55)',
        onUpdate: () => {
          tilt *= 0.9;
          apply();
        },
        onComplete: () => {
          tilt = 0;
          apply();
        },
      });
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      anim?.pause();
      delete el.dataset.drag;
      delete el.dataset.dragging;
      ['--dx', '--dy', '--dr'].forEach((name) => el.style.removeProperty(name));
    };
  }, [reduced]);

  return (
    <div ref={ref} className={`globe-sticker ${className}`} aria-hidden="true">
      {children}
    </div>
  );
}

function GlobeScene({ reduced, location }: { reduced: boolean; location: string }) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || reduced || window.matchMedia('(hover: none)').matches) return;
    const onMove = (event: PointerEvent) => {
      const bounds = scene.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      scene.style.setProperty('--globe-rx', `${(-y * 12).toFixed(2)}deg`);
      scene.style.setProperty('--globe-ry', `${(x * 18).toFixed(2)}deg`);
    };
    const onLeave = () => {
      scene.style.setProperty('--globe-rx', '0deg');
      scene.style.setProperty('--globe-ry', '0deg');
    };
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerleave', onLeave);
    return () => {
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  return (
    <div ref={sceneRef} className="globe-scene" aria-label="A playful interactive globe representing remote-ready digital work">
      <div className="globe-shadow" aria-hidden="true" />
      <div className="globe-asset-wrap" aria-hidden="true">
        <Image src="/assets/hilmi-orbit-world.webp" alt="" width={1254} height={1254} sizes="(max-width: 768px) 80vw, 40vw" className="globe-asset" />
      </div>
      <div className="globe-pin pin-kendari" aria-hidden="true"><span /> {location}</div>
      <DragSticker className="sticker-code" reduced={reduced}>&lt;/&gt;</DragSticker>
      <DragSticker className="sticker-spark" reduced={reduced}>✦</DragSticker>
      <DragSticker className="sticker-cloud" reduced={reduced}>24/7</DragSticker>
      <div className="globe-caption" aria-hidden="true">
        <span>REMOTE READY</span>
        <span className="caption-dot" />
        <span>WORLDWIDE</span>
      </div>
    </div>
  );
}

function About({ profile, i18n }: { profile: Profile; i18n: I18n }) {
  const facts = [
    { key: 'name', label: <LocText idText="Nama" enText="Name" lang={i18n.lang} />, value: profile.name },
    { key: 'role', label: <LocText idText="Peran" enText="Role" lang={i18n.lang} />, value: <LocText idText={profile.primaryRole} enText={profile.primaryRoleEn} lang={i18n.lang} /> },
    { key: 'location', label: <LocText idText="Lokasi" enText="Location" lang={i18n.lang} />, value: profile.location },
    { key: 'focus', label: <LocText idText="Fokus" enText="Focus" lang={i18n.lang} />, value: <LocText idText={profile.focus} enText={profile.focusEn} lang={i18n.lang} /> },
    { key: 'status', label: <LocText idText="Status" enText="Status" lang={i18n.lang} />, value: <LocText idText={profile.status} enText={profile.statusEn} lang={i18n.lang} /> },
  ];
  return (
    <section id="about" className="relative mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36 scroll-mt-16">
      <SectionHeading
        index="01"
        kicker={i18n.tx('about.kicker')}
        title={i18n.tx('about.title')}
        gradient={i18n.lang === 'id' ? ['kode'] : ['code']}
      />

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-20">
        <Reveal delay={120}>
          <div className="about-copy space-y-5 text-on-surface-variant/90 leading-relaxed text-base sm:text-lg">
            <p>
              I&rsquo;m {profile.name} — <LocText idText={profile.primaryRole} enText={profile.primaryRoleEn} lang={i18n.lang} />. <LocText idText={profile.about} enText={profile.aboutEn} lang={i18n.lang} />
            </p>
            <p>
              <LocText idText={profile.aboutSecondary} enText={profile.aboutSecondaryEn} lang={i18n.lang} />
            </p>
          </div>

          <RevealGroup className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 mt-12" staggerMs={100}>
            {STATS.map((s) => (
              <div key={s.label} className="reveal-item stat-sticker">
                <div className="font-display font-black text-3xl sm:text-4xl text-ink">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wide text-ink/70 mt-1.5">{s.label}</div>
              </div>
            ))}
          </RevealGroup>
        </Reveal>

        <Reveal delay={240}>
          <dl className="fact-card border-[3px] border-ink rounded-[1.75rem] bg-yellow divide-y-[3px] divide-ink overflow-hidden text-ink">
            {facts.map((f, index) => (
              <div key={f.key} className={`flex items-center justify-between gap-6 px-6 py-4 ${index === facts.length - 1 ? 'bg-lime' : ''}`}>
                <dt className="font-mono text-[10px] font-black tracking-[0.2em] text-ink/60 uppercase">
                  {f.label}
                </dt>
                <dd className="text-sm font-black text-right text-ink">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

function Skills({ i18n }: { i18n: I18n }) {
  return (
    <section id="skills" className="relative border-y border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36">
        <SectionHeading
          index="02"
          kicker={i18n.tx('skills.kicker')}
          title={i18n.tx('skills.title')}
          gradient={i18n.lang === 'id' ? ['keandalan'] : ['reliability']}
        />

        <RevealGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" staggerMs={110}>
          {SKILLS.map((skill, i) => (
            <div key={skill.group.en} className="reveal-item h-full">
              <CursorSpotlight className={`skill-card skill-card-${i + 1} rounded-[1.75rem] border-[3px] border-ink bg-surface-container/80 animated-border h-full`}>
                <Tilt className="relative p-8 h-full overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <span className="skill-icon w-12 h-12 rounded-xl border-[3px] border-ink flex items-center justify-center text-ink relative z-[3]">
                    {skill.icon}
                  </span>
                  <span className="font-display font-black text-5xl tracking-[-.08em] text-cotton/10 uppercase relative z-[3]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display font-black text-xl text-cotton mb-5 relative z-[3]"><LocText idText={skill.group.id} enText={skill.group.en} lang={i18n.lang} /></h3>
                <ul className="space-y-3.5 relative z-[3]">
                  {skill.items.map((item) => (
                    <li key={typeof item === 'string' ? item : item.en} className="flex items-center gap-3 text-sm text-on-surface-variant group/item">
                      <CheckIcon className="w-4 h-4 text-primary-container shrink-0" />
                      <span className="transition-transform duration-300 group-hover/item:translate-x-1">{typeof item === 'string' ? item : <LocText idText={item.id} enText={item.en} lang={i18n.lang} />}</span>
                    </li>
                  ))}
                </ul>
                </Tilt>
              </CursorSpotlight>
            </div>
          ))}
        </RevealGroup>

        <TechStack />
      </div>
    </section>
  );
}

function TechStack() {
  const [icons, setIcons] = useState<{ slug: string; label: string; url: string }[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/techstack')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => live && setIcons(Array.isArray(list) ? list : []))
      .catch(() => live && setIcons([]));
    return () => {
      live = false;
    };
  }, []);

  if (!icons?.length) return null;

  return (
    <Reveal className="mt-14" delay={120}>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {icons.map((ic) => (
          <div
            key={ic.slug}
            title={ic.label}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-line-strong bg-surface-container/60 p-3 flex items-center justify-center hover:border-primary-container/50 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote images w/ runtime fallback */}
            <img src={ic.url} alt={ic.label} className="max-h-full max-w-full object-contain" loading="lazy" />
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function toTitle(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type ContributionCell = { date: string; level: number; week: number; day: number };
type ContributionData = { username: string; total: number | null; updatedAt: string; cells: ContributionCell[] };

function GitHubContributions({ profile, i18n }: { profile: Profile; i18n: I18n }) {
  const [data, setData] = useState<ContributionData | null>(null);
  const [error, setError] = useState(false);
  const username = profile.github.split('/').filter(Boolean).pop() || 'MHFADev';

  useEffect(() => {
    let live = true;
    const load = () => {
      fetch(`/api/github/contributions?username=${encodeURIComponent(username)}`, { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('contribution request failed')))
        .then((next) => {
          if (!live) return;
          setData(next as ContributionData);
          setError(false);
        })
        .catch(() => live && setError(true));
    };
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [username]);

  return (
    <section id="contributions" className="relative border-y border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeading index="03" kicker={i18n.tx('activity.kicker')} title={i18n.tx('activity.title')} gradient={i18n.lang === 'id' ? ['publik'] : ['public']} />
        <PhysicsWrapper>
          <div className="contribution-panel rounded-[1.75rem] border-[3px] border-ink bg-surface-container/80 p-5 sm:p-8">
          <div className="flex flex-col gap-5 border-b border-line-strong pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3 font-mono text-[10px] font-bold tracking-[.18em] text-cyan uppercase">
                <GitHubIcon className="h-4 w-4" />
                <span>{data?.username ?? username}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />
                <span><LocText idText="KALENDER LANGSUNG" enText="LIVE CALENDAR" lang={i18n.lang} /></span>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant"><LocText idText="Kontribusi publik dari GitHub, diperbarui otomatis setiap lima menit saat halaman ini terbuka." enText="Public contributions from GitHub, refreshed automatically every five minutes while this page is open." lang={i18n.lang} /></p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="font-display text-4xl font-black text-cotton">{data?.total?.toLocaleString(i18n.lang === 'id' ? 'id-ID' : 'en-US') ?? '—'}</div>
              <div className="font-mono text-[10px] font-bold tracking-[.16em] text-on-surface-variant/65 uppercase"><LocText idText="kontribusi / tahun terakhir" enText="contributions / last year" lang={i18n.lang} /></div>
            </div>
          </div>
          {data ? (
            <div className="contribution-scroll mt-7" aria-label={`GitHub contribution calendar for ${data.username}`}>
              <div className="contribution-grid" role="grid" aria-label="GitHub contribution levels">
                {data.cells.map((cell) => (
                  <span
                    key={cell.date}
                    role="gridcell"
                    aria-label={`${cell.date}, activity level ${cell.level} of 4`}
                    title={`${cell.date} · activity level ${cell.level} of 4`}
                    data-level={cell.level}
                    className="contribution-cell"
                    style={{ gridColumn: cell.week + 1, gridRow: cell.day + 1 }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-7 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-line-strong font-mono text-xs text-on-surface-variant/65">{error ? <LocText idText="AKTIVITAS GITHUB SEMENTARA TIDAK TERSEDIA" enText="GITHUB ACTIVITY TEMPORARILY UNAVAILABLE" lang={i18n.lang} /> : <LocText idText="MEMUAT AKTIVITAS GITHUB…" enText="LOADING GITHUB ACTIVITY…" lang={i18n.lang} />}</div>
          )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono font-bold tracking-[.12em] text-on-surface-variant/65 uppercase">
            <span>{data ? <LocText idText={`Disinkronkan ${new Date(data.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`} enText={`Synced ${new Date(data.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`} lang={i18n.lang} /> : <LocText idText="Menyinkronkan dengan GitHub" enText="Syncing with GitHub" lang={i18n.lang} />}</span>
            <a href={profile.github} target="_blank" rel="noreferrer" className="font-black text-cyan underline decoration-cyan/40 underline-offset-4 hover:text-cotton"><LocText idText="Buka profil GitHub ↗" enText="Open GitHub profile ↗" lang={i18n.lang} /></a>
            </div>
          </div>
        </PhysicsWrapper>
      </div>
    </section>
  );
}

type ProjectIcon = { slug: string; label: string; url: string; hex?: string; category?: string };
type Project = { name: string; url: string; title: string; desc: string; titleEn?: string; descEn?: string; techStack: ProjectIcon[] };

const FALLBACK_PROJECTS: Project[] = [
  {
    name: 'infrastructure-operations.webp',
    url: '/foto/WhatsApp%20Image%202026-07-22%20at%2009.57.08.webp',
    title: 'Infrastructure Operations',
    desc: 'Reliable network, hardware, and system support shaped around clear documentation and calm incident response.',
    techStack: [
      { slug: 'linux', label: 'Linux', url: 'https://cdn.simpleicons.org/linux' },
      { slug: 'cisco', label: 'Cisco', url: 'https://cdn.simpleicons.org/cisco' },
      { slug: 'wireshark', label: 'Wireshark', url: 'https://cdn.simpleicons.org/wireshark' },
    ],
  },
  {
    name: 'support-automation.webp',
    url: '/foto/IMG_20260709_130641.webp',
    title: 'Support Automation',
    desc: 'Purpose-built tools that turn repetitive support work into fast, traceable, and human-friendly workflows.',
    techStack: [
      { slug: 'powershell', label: 'PowerShell', url: 'https://cdn.simpleicons.org/powershell' },
      { slug: 'python', label: 'Python', url: 'https://cdn.simpleicons.org/python' },
      { slug: 'windows11', label: 'Windows', url: 'https://cdn.simpleicons.org/windows11' },
    ],
  },
  {
    name: 'full-stack-platforms.webp',
    url: '/foto/WhatsApp%20Image%202026-07-09%20at%2012.06.57.webp',
    title: 'Full-Stack Platforms',
    desc: 'Polished web products built from interface to database with a focus on clarity, speed, and dependable delivery.',
    techStack: [
      { slug: 'nextdotjs', label: 'Next.js', url: 'https://cdn.simpleicons.org/nextdotjs/ffffff' },
      { slug: 'typescript', label: 'TypeScript', url: 'https://cdn.simpleicons.org/typescript' },
      { slug: 'postgresql', label: 'PostgreSQL', url: 'https://cdn.simpleicons.org/postgresql' },
    ],
  },
];


type Certificate = { name: string; url: string; title: string; issuer: string; year: string; desc: string; verifyUrl: string; titleEn?: string; descEn?: string };

function Certificates({ i18n }: { i18n: I18n }) {
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/certificates').then((response) => response.ok ? response.json() : []).then((data) => live && setCertificates(Array.isArray(data) ? data : [])).catch(() => live && setCertificates([]));
    return () => { live = false; };
  }, []);
  if (certificates?.length === 0) return null;
  return (
    <section id="certificates" className="relative border-y border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-28 sm:px-8 sm:py-36">
        <SectionHeading index="04" kicker={i18n.tx('certs.kicker')} title={i18n.tx('certs.title')} gradient={i18n.lang === 'id' ? ['praktik'] : ['practice']} />
        <p className="mb-12 max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg"><LocText idText="Catatan ringkas kursus dan sertifikasi yang menjaga pekerjaan tetap berpijak pada sistem nyata, bukan sekadar layar yang dipoles." enText="A compact record of the courses and certifications that keep the work grounded in real systems, not just polished screens." lang={i18n.lang} /></p>
        {certificates === null ? <div className="py-10 font-mono text-xs text-on-surface-variant/60">LOADING CREDENTIALS…</div> : <div className="grid gap-5 md:grid-cols-2">{certificates.map((certificate, index) => {
          const isPdf = certificate.name.toLowerCase().endsWith('.pdf');
          return <Reveal key={certificate.name} delay={index * 80}><article className="certificate-card group relative overflow-hidden rounded-[1.75rem] border-[3px] border-ink bg-surface-container/80 p-5 sm:p-6">
            <div className="certificate-preview relative mb-6 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface"><span className="certificate-watermark" aria-hidden="true">{isPdf ? 'PDF' : 'CERT'}</span>{isPdf ? <div className="relative z-[1] text-center"><div className="font-display text-5xl font-black text-pink">PDF</div><div className="mt-2 font-mono text-[10px] tracking-[.2em] text-on-surface-variant">CREDENTIAL FILE</div></div> : <img src={certificate.url} alt={`${certificate.title || 'Certificate'} preview`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}</div>
            <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-bold tracking-[.18em] text-cyan">{certificate.issuer || (i18n.lang === 'id' ? 'SERTIFIKASI' : 'CERTIFICATION')} {certificate.year ? `· ${certificate.year}` : ''}</p><h3 className="mt-2 font-display text-2xl font-black tracking-tight text-cotton"><LocText idText={certificate.title || toTitle(certificate.name)} enText={certificate.titleEn} lang={i18n.lang} /></h3></div><span className="certificate-mark" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>{certificate.desc ? <p className="mt-4 text-sm leading-relaxed text-on-surface-variant"><LocText idText={certificate.desc} enText={certificate.descEn} lang={i18n.lang} /></p> : null}<div className="mt-6 flex flex-wrap gap-3"><a href={certificate.url} target="_blank" rel="noreferrer" className="cartoon-button inline-flex min-h-11 items-center rounded-full px-4 py-2 text-xs font-black"><LocText idText="Lihat sertifikat" enText="View certificate" lang={i18n.lang} /></a>{certificate.verifyUrl ? <a href={certificate.verifyUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 py-2 text-xs font-bold text-cyan hover:border-cyan"><LocText idText="Verifikasi kredensial" enText="Verify credential" lang={i18n.lang} /></a> : null}</div>
          </article></Reveal>;
        })}</div>}
      </div>
    </section>
  );
}

function Projects({ i18n }: { i18n: I18n }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const listNear = useNearViewport(listRef, '30% 0px');

  // --pp (-1 → 1) is how far each row sits from the viewport centre; the image drifts against the scroll.
  useScrollFrame(() => {
    const list = listRef.current;
    if (!list) return;
    const vh = window.innerHeight;
    list.querySelectorAll<HTMLElement>('.project-row').forEach((row) => {
      const rect = row.getBoundingClientRect();
      const p = clampTo((rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2), -1, 1);
      row.style.setProperty('--pp', p.toFixed(3));
    });
  }, !reduced && !!projects && listNear);

  useEffect(() => {
    let live = true;
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => live && setProjects(Array.isArray(list) && list.length ? list : FALLBACK_PROJECTS))
      .catch(() => live && setProjects(FALLBACK_PROJECTS));
    return () => {
      live = false;
    };
  }, []);

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36 scroll-mt-16">
        <SectionHeading
        index="05"
        kicker={i18n.tx('projects.kicker')}
        title={i18n.tx('projects.title')}
        gradient={i18n.lang === 'id' ? ['rilis'] : ['lately']}
      />

      <div ref={listRef} className="space-y-24 sm:space-y-32">
        {projects?.map((p, i) => (
          <Reveal key={p.name} delay={60}>
            <article className="project-row group relative grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div className={`relative ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div
                  className={`project-backdrop absolute -inset-3 rounded-[1.75rem] border-[3px] border-ink pointer-events-none transition-transform duration-700 group-hover:rotate-0 project-backdrop-${(i % 3) + 1}`}
                  aria-hidden="true"
                />
                <Tilt className="relative">
                  <div className="relative rounded-2xl overflow-hidden border-[3px] border-ink bg-surface-container aspect-[16/11] animated-border shadow-[10px_12px_0_var(--color-ink)]">
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="project-parallax">
                        <SmartImage
                          src={p.url}
                          alt={`${p.title || toTitle(p.name)} preview`}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          fallback={<ProjectFallback name={p.title || toTitle(p.name)} />}
                        />
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      aria-hidden="true"
                    />
                  </div>
                </Tilt>
              </div>

              <div className={`project-copy ${i % 2 === 1 ? 'lg:order-1 project-copy-reverse' : ''}`}>
                <div className="flex items-center gap-4 font-mono text-[11px] font-bold tracking-[0.2em] text-on-surface-variant/70 mb-5">
                  <span className="project-number">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-px w-10 bg-line-strong" aria-hidden="true" />
                  <span><LocText idText={p.title || toTitle(p.name)} enText={p.titleEn} lang={i18n.lang} /></span>
                </div>
                <h3 className="font-display font-black tracking-[-0.035em] text-3xl sm:text-4xl text-cotton mb-4">
                  <LocText idText={p.title || toTitle(p.name)} enText={p.titleEn} lang={i18n.lang} />
                </h3>
                {p.desc && (
                  <p className="text-on-surface-variant/90 leading-relaxed mb-7 max-w-md text-base sm:text-lg"><LocText idText={p.desc} enText={p.descEn} lang={i18n.lang} /></p>
                )}
                {p.techStack?.length ? (
                  <div className="flex flex-wrap gap-2" aria-label="Project technology stack">
                    {p.techStack.slice(0, 8).map((icon) => (
                      <span key={icon.slug} className="project-tech-chip inline-flex items-center gap-2 rounded-full border-2 border-ink bg-cotton px-3 py-2 text-xs font-black text-ink shadow-[3px_4px_0_var(--color-ink)]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- official runtime icon CDN */}
                        <img src={icon.url} alt="" className="h-4 w-4 object-contain" loading="lazy" />
                        {icon.label}
                      </span>
                    ))}
                    {p.techStack.length > 8 ? (
                      <span className="inline-flex items-center rounded-full border-2 border-ink bg-yellow px-3 py-2 text-xs font-black text-ink shadow-[3px_4px_0_var(--color-ink)]">+{p.techStack.length - 8}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          </Reveal>
        ))}

        {projects === null && (
          <Reveal delay={80}>
            <div className="flex items-center justify-center py-12">
              <span className="text-sm text-on-surface-variant/60 font-mono">LOADING PROJECTS…</span>
            </div>
          </Reveal>
        )}

        {projects?.length === 0 && (
          <Reveal delay={80}>
            <div className="border border-dashed border-line-strong rounded-2xl px-8 py-8 flex items-center justify-center text-center">
              <p className="text-sm text-on-surface-variant/60">
                No projects yet —{' '}
                <a href="#contact" className="text-primary-container font-medium underline-offset-4 hover:underline">
                  ask me about them
                </a>
                .
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

const WORLD_STOPS = [
  {
    img: '/foto/WhatsApp%20Image%202026-07-22%20at%2009.57.08.webp',
    eyebrow: { en: '01 · The bench', id: '01 · Meja kerja' },
    short: { en: 'The bench', id: 'Meja kerja' },
    title: { en: 'From the workbench up.', id: 'Dari meja kerja ke atas.' },
    body: { en: 'Every system I touch gets the same treatment: diagnosed, stabilized, documented.', id: 'Setiap sistem yang saya sentuh mendapat perlakuan yang sama: didiagnosis, distabilkan, didokumentasikan.' },
    tags: [{ en: 'Support', id: 'Dukungan' }, { en: 'Troubleshooting', id: 'Pemecahan Masalah' }, { en: 'Maintenance', id: 'Perawatan' }],
    accent: '#c6ff33',
  },
  {
    img: '/foto/IMG_20260709_130641.webp',
    eyebrow: { en: '02 · The code', id: '02 · Kode' },
    short: { en: 'The code', id: 'Kode' },
    title: { en: 'Where maintenance meets software.', id: 'Saat perawatan bertemu perangkat lunak.' },
    body: { en: 'Support tools, dashboards, and full apps, shipped with Next.js & TypeScript.', id: 'Alat pendukung, dasbor, dan aplikasi penuh, dibangun dengan Next.js & TypeScript.' },
    tags: ['Next.js', 'TypeScript', 'Full-Stack'],
    accent: '#7d39eb',
  },
  {
    img: '/foto/WhatsApp%20Image%202026-07-09%20at%2012.06.57.webp',
    eyebrow: { en: '03 · On the floor', id: '03 · Di lapangan' },
    short: { en: 'On the floor', id: 'Di lapangan' },
    title: { en: 'Hands-on support.', id: 'Dukungan langsung di lokasi.' },
    body: { en: 'Close to the end user, on-site when it counts, calm under pressure.', id: 'Dekat dengan pengguna akhir, hadir di lokasi saat dibutuhkan, tenang di bawah tekanan.' },
    tags: [{ en: 'IT Support', id: 'Dukungan IT' }, { en: 'Network', id: 'Jaringan' }, { en: 'On-site', id: 'Di Lokasi' }],
    accent: '#ffffff',
  },
  {
    img: '/foto/WhatsApp%20Image%202026-07-11%20at%2012.08.26.webp',
    eyebrow: { en: '04 · The infrastructure', id: '04 · Infrastruktur' },
    short: { en: 'Infrastructure', id: 'Infrastruktur' },
    title: { en: 'Keeping systems alive.', id: 'Menjaga sistem tetap hidup.' },
    body: { en: 'Servers, switches, and the connections between them, stable and monitored.', id: 'Server, switch, dan koneksi di antaranya, stabil dan terpantau.' },
    tags: [{ en: 'Infrastructure', id: 'Infrastruktur' }, 'Server', { en: 'Network', id: 'Jaringan' }],
    accent: '#a678ff',
  },
];

function WorldScroll({ i18n }: { i18n: I18n }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!section || !track || !sticky || reduced) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.world-card'));

    // Layout is measured only on mount/resize; per-frame work reads nothing from the DOM.
    let travel = 0;
    let centers: number[] = [];
    let widths: number[] = [];
    let raf = 0;
    let skew = 0;
    let lastX = 0;
    let isStatic = false;
    let lastActive = -2;
    const lastFocus: number[] = [];
    const lastPar: number[] = [];
    const dims = cards.map((card) => card.querySelector<HTMLElement>('.world-dim'));
    const pars = cards.map((card) => card.querySelector<HTMLElement>('.world-parallax'));

    const measure = () => {
      const vw = window.innerWidth;
      travel = Math.max(0, track.scrollWidth - vw + vw * 0.12);
      centers = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
      widths = cards.map((card) => card.offsetWidth);
    };

    const reset = () => {
      track.style.transform = '';
      cards.forEach((card, i) => {
        card.style.removeProperty('scale');
        dims[i]?.style.removeProperty('opacity');
        pars[i]?.style.removeProperty('translate');
      });
      sticky.style.removeProperty('--world-accent');
      lastFocus.length = 0;
      lastPar.length = 0;
      skew = 0;
      lastX = 0;
    };

    const frame = () => {
      raf = 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw < 900) {
        // Narrow screens use the native horizontal scroller (see CSS).
        if (!isStatic) {
          reset();
          isStatic = true;
          lastActive = -2;
          setActive(-1);
        }
        return;
      }
      isStatic = false;

      const range = Math.max(1, section.offsetHeight - vh);
      const progress = clamp01(-section.getBoundingClientRect().top / range);
      const x = -travel * progress;
      // Skew eases toward the horizontal speed, then relaxes to 0 once scrolling stops.
      skew += (clampTo((x - lastX) * -0.07, -4, 4) - skew) * 0.2;
      lastX = x;
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;

      let best = -1;
      let bestFocus = 0;
      cards.forEach((card, i) => {
        const d = (centers[i] + x - vw / 2) / (vw * 0.55);
        const focus = clamp01(1 - Math.abs(d));
        const reach = widths[i] * 0.085;
        const par = Math.round(clampTo(-d * widths[i] * 0.09, -reach, reach) * 2) / 2;
        const f = Math.round(focus * 200) / 200;
        if (f !== lastFocus[i]) {
          lastFocus[i] = f;
          card.style.scale = String(0.92 + f * 0.08);
          const dim = dims[i];
          if (dim) dim.style.opacity = String((1 - f) * 0.55);
        }
        if (par !== lastPar[i]) {
          lastPar[i] = par;
          const layer = pars[i];
          if (layer) layer.style.translate = `${par}px 0`;
        }
        if (focus > bestFocus) {
          bestFocus = focus;
          best = i;
        }
      });
      const next = bestFocus > 0.45 ? best : -1;
      if (next !== lastActive) {
        lastActive = next;
        setActive(next);
        if (next >= 0) sticky.style.setProperty('--world-accent', WORLD_STOPS[next].accent);
        else sticky.style.removeProperty('--world-accent');
      }
      if (Math.abs(skew) > 0.02) raf = requestAnimationFrame(frame);
    };

    const queue = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      measure();
      queue();
    };

    measure();
    frame();
    if ('fonts' in document) document.fonts.ready.then(onResize);
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      reset();
    };
  }, [reduced]);

  const jumpTo = (index: number) => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const card = track?.querySelectorAll<HTMLElement>('.world-card')[index];
    if (!section || !track || !card) return;
    const vw = window.innerWidth;
    const range = Math.max(1, section.offsetHeight - window.innerHeight);
    const travel = Math.max(0, track.scrollWidth - vw + vw * 0.12);
    const needed = clampTo(card.offsetLeft + card.offsetWidth / 2 - vw / 2, 0, travel);
    const top = section.getBoundingClientRect().top + window.scrollY + (travel ? needed / travel : 0) * range;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section id="story" ref={sectionRef} data-static={reduced ? 'true' : undefined} className="world-section relative border-y border-line-strong scroll-mt-16">
      <div ref={stickyRef} className="world-sticky sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute inset-0 world-grid pointer-events-none" aria-hidden="true" />
        <div className="absolute left-5 sm:left-8 top-24 z-20 flex items-center gap-4 font-mono text-[10px] sm:text-xs font-bold tracking-[0.22em] text-on-surface-variant">
          <span className="text-yellow">06</span>
          <span><LocText idText="JELAJAHI DUNIA" enText="SCROLL THE WORLD" lang={i18n.lang} /></span>
          <span className="hidden sm:block w-24 h-px bg-line-strong" />
        </div>
        <div ref={trackRef} className="world-track relative flex items-stretch gap-8 sm:gap-12 px-[7vw] will-change-transform">
          <article className="world-intro shrink-0 flex flex-col justify-center w-[84vw] lg:w-[62vw] xl:w-[48vw] pr-6">
            <span className="world-kicker"><LocText idText="CATATAN LAPANGAN / 2026" enText="FIELD NOTES / 2026" lang={i18n.lang} /></span>
            <h2 className="font-display font-black tracking-[-0.055em] text-[clamp(3.4rem,8vw,7.8rem)] leading-[.9] text-cotton mt-5">
              {i18n.lang === 'id' ? <>KERJA<br />NYATA.<br /><span className="text-pink">DUNIA</span> NYATA.</> : i18n.lang === 'en' ? <>REAL<br />WORK.<br /><span className="text-pink">REAL</span> WORLD.</> : <LocText idText="Kerja nyata. Dunia nyata." enText="Real work. Real world." lang={i18n.lang} />}
            </h2>
            <p className="mt-7 max-w-lg text-on-surface-variant text-base sm:text-lg leading-relaxed">
              <LocText idText="Gerakkan pandangan menyamping sementara halaman bergerak ke bawah. Tur dunia kecil melalui sistem, kode, dan kerja langsung di balik setiap hasil." enText="Drag your eyes sideways while the page moves down. A small world tour through the systems, code, and hands-on work behind every result." lang={i18n.lang} />
            </p>
            <div className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold tracking-[.18em] text-cyan">
              <LocText idText="TERUS GULIR" enText="KEEP SCROLLING" lang={i18n.lang} /> <span className="text-2xl">→</span>
            </div>
          </article>

          {WORLD_STOPS.map((scene, index) => (
            <article
              key={scene.eyebrow.en}
              className={`world-card world-card-${index + 1} shrink-0 w-[84vw] sm:w-[70vw] lg:w-[56vw] xl:w-[46rem]`}
              style={{ '--scene-accent': scene.accent } as CSSProperties}
            >
              <div className="world-card-image">
                <div className="world-dim" aria-hidden="true" />
                <div className="world-parallax">
                  <SmartImage src={scene.img} alt={`${scene.title.en} — field work`} loading="eager" className="absolute inset-0 w-full h-full object-cover" fallback={<ProjectFallback name={scene.title.en} />} />
                </div>
                <div className="world-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
              </div>
              <div className="world-card-copy">
                <p className="font-mono text-[10px] sm:text-xs font-bold tracking-[.18em] uppercase" style={{ color: scene.accent }}><LocText idText={scene.eyebrow.id} enText={scene.eyebrow.en} lang={i18n.lang} /></p>
                <h3 className="font-display font-black text-2xl sm:text-4xl tracking-[-.03em] text-cotton mt-3"><LocText idText={scene.title.id} enText={scene.title.en} lang={i18n.lang} /></h3>
                <p className="text-on-surface-variant mt-3 leading-relaxed max-w-xl"><LocText idText={scene.body.id} enText={scene.body.en} lang={i18n.lang} /></p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {scene.tags.map((tag) => <span key={typeof tag === 'string' ? tag : tag.en} className="world-tag">{typeof tag === 'string' ? tag : <LocText idText={tag.id} enText={tag.en} lang={i18n.lang} />}</span>)}
                </div>
              </div>
            </article>
          ))}

          <article className="world-finale shrink-0 w-[84vw] lg:w-[48vw] flex flex-col items-start justify-center pr-[8vw]">
            <div className="finale-face" aria-hidden="true"><span>•</span><span>ᴗ</span><span>•</span></div>
            <p className="world-kicker mt-7"><LocText idText="TUJUAN AKHIR" enText="FINAL DESTINATION" lang={i18n.lang} /></p>
            <h2 className="font-display font-black tracking-[-.05em] text-4xl sm:text-6xl text-cotton mt-4">{i18n.lang === 'id' ? <>PROYEK BESAR<br /><span className="text-lime">ANDA BERIKUTNYA.</span></> : i18n.lang === 'en' ? <>YOUR NEXT<br /><span className="text-lime">BIG THING.</span></> : <LocText idText="Proyek besar Anda berikutnya." enText="Your next big thing." lang={i18n.lang} />}</h2>
            <a href="#contact" className="cartoon-button cartoon-button-primary inline-flex items-center gap-2 mt-8 rounded-full px-7 py-3.5 text-sm font-black">
              <LocText idText="Wujudkan sekarang" enText="Let's make it real" lang={i18n.lang} /> <ArrowUpRightIcon className="w-4 h-4" />
            </a>
          </article>
        </div>

        <nav className="world-steps" aria-label="Journey scenes">
          {WORLD_STOPS.map((scene, index) => (
            <button
              key={scene.short.en}
              type="button"
              onClick={() => jumpTo(index)}
              aria-current={active === index ? 'step' : undefined}
              aria-label={`Scene ${index + 1}: ${scene.short.en}`}
              className="world-step"
              style={{ '--scene-accent': scene.accent } as CSSProperties}
            >
              <span className="world-step-count">{String(index + 1).padStart(2, '0')}</span>
              <span className="world-step-name"><LocText idText={scene.short.id} enText={scene.short.en} lang={i18n.lang} /></span>
            </button>
          ))}
        </nav>
        <div className="world-progress-wrap absolute bottom-6 left-[7vw] right-[7vw] h-1 rounded-full bg-line-strong overflow-hidden">
          <div ref={progressRef} className="world-progress h-full origin-left" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </section>
  );
}

function Contact({ profile, i18n }: { profile: Profile; i18n: I18n }) {
  const socials = [
    { label: 'GitHub', href: profile.github, icon: <GitHubIcon className="w-4 h-4" /> },
    { label: 'LinkedIn', href: profile.linkedin, icon: <LinkedInIcon className="w-4 h-4" /> },
    { label: 'Email', href: profile.email ? `mailto:${profile.email}` : '', icon: <MailIcon className="w-4 h-4" /> },
    { label: 'Phone', href: profile.phone ? `tel:${profile.phone.replace(/[^\d+]/g, '')}` : '', icon: <PhoneIcon className="w-4 h-4" /> },
    ...profile.extraLinks
      .filter((link) => link.label.trim() && /^(https?:\/\/|mailto:|tel:)/i.test(link.url.trim()))
      .map((link) => ({ label: link.label.trim(), href: link.url.trim(), icon: <ArrowUpRightIcon className="w-4 h-4" /> })),
  ].filter((social) => Boolean(social.href));
  return (
    <section id="contact" className="relative border-t border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-40">
        <SectionHeading
          index="07"
          kicker={i18n.tx('contact.kicker')}
          title={i18n.tx('contact.title')}
          useFlip
        />

        <Reveal delay={120}>
          <CursorSpotlight className="contact-card relative rounded-[2rem] border-[4px] border-ink bg-cyan p-8 sm:p-12 grid lg:grid-cols-[1fr_.82fr] items-center gap-8 overflow-hidden text-ink">
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary-container) 16%, transparent) 0%, transparent 68%)' }}
              aria-hidden="true"
            />
            <div className="relative z-[3] max-w-xl">
              <p className="text-ink/80 font-medium text-lg leading-relaxed mb-8">
                <LocText idText={profile.availability} enText={profile.availabilityEn} lang={i18n.lang} />
              </p>
              <div className="flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith('http') ? '_blank' : undefined}
                    rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2.5 rounded-full border-2 border-ink bg-cotton px-5 py-2.5 text-sm font-black text-ink shadow-[3px_4px_0_var(--color-ink)] hover:-translate-y-1 transition-transform"
                  >
                    {s.icon}
                    {s.label}
                  </a>
                ))}
                {profile.cvFileName ? (
                  <a href="/api/cv" download className="inline-flex items-center gap-2.5 rounded-full border-2 border-ink bg-yellow px-5 py-2.5 text-sm font-black text-ink shadow-[3px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-1">
                    <LocText idText="Unduh CV" enText="Download CV" lang={i18n.lang} /> <span aria-hidden="true">↓</span>
                  </a>
                ) : null}
              </div>
            </div>

            <div className="contact-action relative z-[3] flex flex-col items-center">
              <Image
                src="/assets/hilmi-workstation-island.webp"
                alt="3D workstation with server, laptop, and network cables"
                width={1400}
                height={933}
                sizes="(max-width: 768px) 100vw, 448px"
                className="contact-asset w-full max-w-md"
                loading="lazy"
                decoding="async"
              />
              <Magnetic strength={0.25}>
                <a
                  href={profile.email ? `mailto:${profile.email}` : '#contact'}
                  className="cartoon-button cartoon-button-primary group relative inline-flex items-center gap-3 rounded-full px-8 py-5 text-base font-black"
                >
                  Start a conversation
                  <ArrowUpRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Magnetic>
            </div>
          </CursorSpotlight>
        </Reveal>
      </div>
    </section>
  );
}

const RAIL: { id: string; label: string; key: UiKey | null }[] = [
  { id: 'top', label: 'Intro', key: 'nav.intro' },
  { id: 'about', label: 'About', key: 'nav.about' },
  { id: 'skills', label: 'Skills', key: 'nav.skills' },
  { id: 'certificates', label: 'Certificates', key: 'nav.certificates' },
  { id: 'projects', label: 'Work', key: 'nav.work' },
  { id: 'story', label: 'Journey', key: 'nav.journey' },
  { id: 'contact', label: 'Contact', key: 'nav.contact' },
];

/** Persistent wayfinding: the top navbar hides while scrolling down, so this keeps "where am I" visible. */
function SectionRail({ i18n }: { i18n: I18n }) {
  const [active, setActive] = useState('top');

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    RAIL.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Page sections" className="section-rail hidden xl:flex">
      {RAIL.map((item) => (
        <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined} className="rail-link">
          <span className="rail-label">{item.key ? i18n.tx(item.key) : item.label}</span>
          <span className="rail-dot" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}

function ScrollChrome() {
  const barRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const p = doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      setShowTop(doc.scrollTop > 700);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div
        ref={barRef}
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-[#7d39eb] to-[#c6ff33]"
        style={{ transform: 'scaleX(0)' }}
        aria-hidden="true"
      />
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full border border-line-strong bg-surface-container/80 backdrop-blur flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:border-primary-container/60 transition-all duration-300 ${
          showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUpIcon className="w-4.5 h-4.5" />
      </button>
    </>
  );
}

export default function Portfolio() {
  const i18n = useI18n();
  const [theme, setTheme] = useState('dark');
  const [introReady, setIntroReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const reduced = useReducedMotion();
  const completeIntro = useCallback(() => setIntroReady(true), []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const saved = localStorage.getItem('theme');
      if (saved) setTheme(saved);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    let live = true;
    fetch('/api/profile')
      .then((response) => response.ok ? response.json() : DEFAULT_PROFILE)
      .then((data) => { if (live) setProfile(data as Profile); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  return (
    <div className="min-h-screen text-on-surface relative">
      {!introReady && <CinematicLoader reduced={reduced} profile={profile} onComplete={completeIntro} lang={i18n.lang} />}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="ambient-orb ambient-orb-a absolute top-[-22%] right-[-12%] w-[58vw] h-[58vw] rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary-container) 9%, transparent) 0%, transparent 65%)' }}
        />
        <div
          className="ambient-orb ambient-orb-b absolute bottom-[-26%] left-[-14%] w-[52vw] h-[52vw] rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 7%, transparent) 0%, transparent 65%)' }}
        />
      </div>

      <SmoothScroll />
      <ScrollMomentum />
      <ScrollChrome />
      <SectionRail i18n={i18n} />
      <div className="fixed inset-0 pointer-events-none z-[1] grain" aria-hidden="true" />
      <Navbar theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} i18n={i18n} />

      <main className="relative z-10">
        <ScrollHero reduced={reduced} profile={profile} lang={i18n.lang} />
        <Marquee items={MARQUEE_ITEMS} />
        <About profile={profile} i18n={i18n} />
        <Skills i18n={i18n} />
        <GitHubContributions profile={profile} i18n={i18n} />
        <Certificates i18n={i18n} />
        <Projects i18n={i18n} />
        <WorldScroll i18n={i18n} />
        <Contact profile={profile} i18n={i18n} />
      </main>

      <footer className="relative z-10 border-t border-line-strong">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-lime border-2 border-ink" aria-hidden="true" />
            <span className="font-display font-semibold text-cotton">
              {profile.shortName}<span className="text-primary-container">.</span>
            </span>
          </div>
          <p className="font-mono text-[11px] text-on-surface-variant/60 text-center">
            © 2026 {profile.name} — Built with Next.js & anime.js
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 font-mono text-[11px] text-on-surface-variant/60 hover:text-primary-container transition-colors"
          >
            <LocText idText="Kembali ke atas" enText="Back to top" lang={i18n.lang} />
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}

function ProjectFallback({ name }: { name: string }) {
  return (
    <div className="project-fallback absolute inset-0 flex flex-col items-center justify-center gap-5 overflow-hidden">
      <span className="fallback-orbit" aria-hidden="true" />
      <span className="fallback-mark" aria-hidden="true">{name.slice(0, 1)}</span>
      <span className="relative z-[2] max-w-[80%] text-center font-display font-black text-3xl sm:text-5xl text-ink tracking-[-.04em] select-none">
        {name}
      </span>
      <span className="relative z-[2] font-mono text-[10px] font-black tracking-[0.25em] text-ink/60">
        CASE STUDY · HILMI
      </span>
    </div>
  );
}

function ArrowUpRightIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

function ArrowUpIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

function CheckIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SunIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MenuIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function LayersIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function CodeIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  );
}

function WrenchIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function GitHubIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18.92-.26 1.9-.38 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45Z" />
    </svg>
  );
}

function MailIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 8-10 6L2 8" />
    </svg>
  );
}

function PhoneIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
