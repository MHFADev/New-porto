'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode, SVGProps } from 'react';
import { animate, onScroll, stagger } from 'animejs';
import type { JSAnimation, ScrollObserver } from 'animejs';
import { DEFAULT_PROFILE } from '@/lib/profile';
import type { Profile } from '@/lib/profile';

const NAV = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Work', href: '#projects' },
  { label: 'Journey', href: '#story' },
  { label: 'Contact', href: '#contact' },
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
    group: 'Infrastructure',
    icon: <LayersIcon className="w-5 h-5" />,
    items: ['IT Support & Troubleshooting', 'Network Administration', 'System Maintenance', 'Hardware Diagnostics'],
  },
  {
    group: 'Languages',
    icon: <CodeIcon className="w-5 h-5" />,
    items: ['Next.js / TypeScript', 'JavaScript', 'Python', 'HTML / CSS', 'Tailwind CSS'],
  },
  {
    group: 'Tools',
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

function CinematicLoader({ reduced, profile, onComplete }: { reduced: boolean; profile: Profile; onComplete: () => void }) {
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
    const minimum = reduced ? 180 : 1500;
    const preload = (src: string) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = src;
    });
    const fontsReady = 'fonts' in document ? document.fonts.ready.then(() => undefined) : Promise.resolve();
    Promise.all([
      fontsReady,
      preload('/assets/hilmi-orbit-world.png'),
      preload('/assets/hilmi-workstation-island.png'),
    ]).finally(() => { resourcesReady = true; });

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
          <p data-loader-piece className="mb-5 font-mono text-[10px] font-bold tracking-[.26em] text-cyan sm:text-xs">CRAFTING YOUR EXPERIENCE</p>
          <div data-loader-piece className="loader-signal relative">
            <div className="loader-signal-ring loader-signal-ring-a" aria-hidden="true" />
            <div className="loader-signal-ring loader-signal-ring-b" aria-hidden="true" />
            <div className="loader-monogram" aria-hidden="true"><span>M</span><i>H</i></div>
            <span className="loader-chip loader-chip-a">DESIGN</span>
            <span className="loader-chip loader-chip-b">CODE</span>
            <span className="loader-chip loader-chip-c">SYSTEMS</span>
          </div>
          <div data-loader-piece className="mt-2 flex items-end justify-between gap-5">
            <p className="max-w-xs font-mono text-[9px] font-bold leading-relaxed tracking-[.18em] text-on-surface-variant sm:text-[10px]">MOVE YOUR CURSOR<br />THE INTERFACE IS LISTENING</p>
            <div className="text-right">
              <p className="mb-1 font-mono text-[9px] font-bold tracking-[.22em] text-on-surface-variant">LOADING</p>
              <div className="font-display text-[clamp(3.6rem,10vw,8rem)] font-black leading-[.72] tracking-[-.07em] tabular-nums">{String(progress).padStart(2, '0')}<span className="text-[.3em] text-yellow">%</span></div>
            </div>
          </div>
          <div data-loader-piece className="mt-7 h-2 overflow-hidden rounded-full border-2 border-ink bg-cotton shadow-[4px_5px_0_var(--color-ink)]">
            <div className="h-full origin-left bg-lime transition-transform duration-100" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
        </div>
        <div data-loader-piece className="flex items-center justify-between font-mono text-[10px] font-bold tracking-[.16em] text-on-surface-variant">
          <span>IT SUPPORT × FULL-STACK</span><span className="flex items-center gap-2 text-active"><i className="loader-status-dot" /> SYSTEMS ONLINE</span>
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

    const tick = () => {
      running = false;
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.4) cur = target;
      window.scrollTo(0, cur);
      if (Math.abs(target - cur) > 0.4) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const max = html.scrollHeight - window.innerHeight;
      target = Math.min(max, Math.max(0, target + e.deltaY));
      start();
    };
    const onNativeScroll = () => {
      if (!running) target = window.scrollY;
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
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => live && setStatus('ok');
    img.onerror = () => live && setStatus('error');
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);

  if (status === 'ok') {
    // eslint-disable-next-line @next/next/no-img-element -- remote images w/ runtime fallback
    return <img src={src} alt={alt} className={`${className ?? ''} image-loaded`} loading="lazy" />;
  }
  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }
  return <div className={`${className ?? ''} image-skeleton`} aria-hidden="true" />;
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

function ImageReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.style.clipPath = 'circle(0% at 50% 50%)';
    let anim: JSAnimation | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !anim) {
          anim = animate(el, {
            clipPath: ['circle(0% at 50% 50%)', 'circle(75% at 50% 50%)'],
            duration: 1200,
            delay,
            ease: 'outExpo',
          });
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.pause();
    };
  }, [delay, reduced]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'clip-path' }}>
      {children}
    </div>
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

function Navbar({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState('');
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (reduced) {
      el.style.opacity = '1';
      return;
    }
    const anim = animate(el, {
      opacity: [0, 1],
      translateY: [-12, 0],
      duration: 350,
      ease: 'outQuad',
    });
    return () => {
      anim.pause();
    };
  }, [open, reduced]);

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-50 transition-[translate,background-color,box-shadow,border-color] duration-500 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled || open ? 'bg-surface/85 backdrop-blur-xl border-b border-line-strong shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]' : 'bg-transparent border-b border-transparent'}`}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <a href="#top" className="brand-badge font-display font-black text-lg text-ink tracking-tight">
            hilmi<span>.</span>
            <span className="hidden sm:inline font-mono text-[10px] font-normal text-on-surface-variant/60 ml-2">
              my.id
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`group relative text-sm font-medium px-3 py-2 transition-colors ${
                  active === item.href.slice(1)
                    ? 'text-primary-container'
                    : 'text-on-surface-variant hover:text-cotton'
                }`}
              >
                {item.label}
                <span
                  className={`absolute left-3 right-3 bottom-0.5 h-px bg-primary-container transition-transform duration-300 origin-left ${
                    active === item.href.slice(1) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                  aria-hidden="true"
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggle}
              aria-label="Toggle color theme"
              className="w-10 h-10 rounded-full border border-line-strong flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:border-primary-container/50 transition-colors"
            >
              {theme === 'dark' ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
            </button>
            <a
              href="#contact"
              className="hidden md:inline-flex items-center gap-2 rounded-full border-2 border-ink bg-yellow text-ink px-5 py-2.5 text-sm font-black shadow-[4px_5px_0_var(--color-ink)] hover:-translate-y-0.5 transition-transform"
            >
              Hire me
            </a>
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="md:hidden w-10 h-10 rounded-full border border-line-strong flex items-center justify-center text-on-surface-variant"
            >
              {open ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          ref={panelRef}
          className="md:hidden fixed top-16 inset-x-0 z-40 border-b border-line-strong bg-surface/95 backdrop-blur-xl"
        >
          <nav className="px-6 py-5 flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between py-3 text-base font-medium border-b border-line last:border-0 ${
                  active === item.href.slice(1) ? 'text-primary-container' : 'text-cotton'
                }`}
              >
                {item.label}
                <span className="font-mono text-[10px] text-on-surface-variant/50">→</span>
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
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
        {/* eslint-disable-next-line @next/next/no-img-element -- generated transparent portfolio artwork */}
        <img src="/assets/hilmi-orbit-world.png" alt="" className="globe-asset" />
      </div>
      <div className="globe-pin pin-kendari" aria-hidden="true"><span /> {location}</div>
      <div className="globe-sticker sticker-code" aria-hidden="true">&lt;/&gt;</div>
      <div className="globe-sticker sticker-spark" aria-hidden="true">✦</div>
      <div className="globe-sticker sticker-cloud" aria-hidden="true">24/7</div>
      <div className="globe-caption" aria-hidden="true">
        <span>REMOTE READY</span>
        <span className="caption-dot" />
        <span>WORLDWIDE</span>
      </div>
    </div>
  );
}

function Hero({ reduced, ready, profile }: { reduced: boolean; ready: boolean; profile: Profile }) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (!ready) return;
    if (reduced) {
      el.querySelectorAll<HTMLElement>('[data-hero]').forEach((n) => {
        n.style.opacity = '1';
        n.style.transform = 'none';
      });
      return;
    }
    const targets = el.querySelectorAll<HTMLElement>('[data-hero]');
    const anim = animate(targets, {
      opacity: [0, 1],
      translateY: [48, 0],
      duration: 1100,
      delay: stagger(90, { start: 200 }),
      ease: 'outExpo',
    });
    return () => {
      anim.pause();
    };
  }, [ready, reduced]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (reduced) return;
    const cleanup: (() => void)[] = [];
    el.querySelectorAll<HTMLElement>('[data-parallax]').forEach((t) => {
      const speed = parseFloat(t.dataset.parallax || '0');
      const obs: ScrollObserver = onScroll({
        target: t,
        sync: 30,
        enter: 'top 120%',
        leave: 'top -80%',
        onUpdate: (self) => {
          t.style.transform = `translate3d(0, ${(-280 * speed * self.progress).toFixed(2)}px, 0)`;
        },
      });
      cleanup.push(() => obs.revert());
    });
    return () => cleanup.forEach((fn) => fn());
  }, [reduced]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (reduced) return;
    const orb = el.querySelector<HTMLElement>('[data-bob]');
    if (!orb) return;
    const anim = animate(orb, {
      translateY: [0, -22],
      duration: 4200,
      ease: 'inOutSine',
      direction: 'alternate',
      loop: true,
    });
    return () => {
      anim.pause();
    };
  }, [reduced]);

  return (
    <section id="top" ref={heroRef} className="hero-playground relative min-h-screen flex items-center overflow-hidden pt-16">
      <AnimatedRays />
      <div className="absolute inset-0 playground-grid pointer-events-none" aria-hidden="true" />
      <div
        data-parallax="0.35"
        className="hero-blob hero-blob-pink absolute -top-44 -right-32 w-[42rem] h-[42rem] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        data-parallax="0.18"
        className="hero-blob hero-blob-blue absolute bottom-[-32%] left-[-18%] w-[40rem] h-[40rem] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        data-bob
        className="absolute top-[19%] left-[5%] text-[clamp(4rem,10vw,9rem)] font-display font-black text-cotton/[0.035] -rotate-12 pointer-events-none"
        aria-hidden="true"
      >HELLO!</div>
      <div
        data-bob
        className="absolute bottom-[20%] right-[7%] text-[clamp(3rem,7vw,7rem)] font-display font-black text-cotton/[0.04] rotate-12 pointer-events-none"
        style={{ animationDelay: '-2.1s' }}
        aria-hidden="true"
      >CREATE</div>

      <div className="relative mx-auto max-w-[82rem] px-5 sm:px-8 w-full grid lg:grid-cols-[1.08fr_0.92fr] gap-12 lg:gap-8 items-center py-24 sm:py-28">
        <div>
          <div
            data-hero
            style={{ opacity: 0 }}
            className="hero-pill inline-flex items-center gap-2.5 rounded-full border-2 border-ink bg-lime px-4 py-2 mb-8 text-ink"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-active opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-active" />
            </span>
            <span className="text-xs font-bold tracking-wide">
              {profile.status.toUpperCase()}
            </span>
          </div>

          <p data-hero style={{ opacity: 0 }} className="font-mono text-xs sm:text-sm font-bold tracking-[0.24em] text-cyan mb-5 uppercase">
            {profile.name} · {profile.locationShort}
          </p>

          <h1 className="font-display font-black tracking-[-0.055em] leading-[0.92] text-[clamp(3.7rem,9.2vw,7.5rem)] text-cotton mb-7 max-w-4xl">
            <span data-hero style={{ opacity: 0 }} className="block overflow-hidden">
              <span className="block">I KEEP</span>
            </span>
            <span data-hero style={{ opacity: 0 }} className="block overflow-hidden">
              <span className="block"><span className="hero-word hero-word-pink">SYSTEMS</span> HAPPY</span>
            </span>
            <span data-hero style={{ opacity: 0 }} className="block overflow-hidden">
              <span className="block">&amp; <span className="hero-word hero-word-yellow">IDEAS</span> ALIVE.</span>
            </span>
          </h1>

          <p data-hero style={{ opacity: 0 }} className="font-display font-medium text-lg sm:text-xl text-on-surface-variant mb-5">
            <RoleRotator roles={profile.roles.length ? profile.roles : [profile.primaryRole]} />
          </p>

          <p data-hero style={{ opacity: 0 }} className="text-base sm:text-lg text-on-surface-variant/90 max-w-xl leading-relaxed mb-10">
            {profile.heroIntro}
          </p>

          <div data-hero style={{ opacity: 0 }} className="flex flex-wrap items-center gap-4 mb-12">
            <Magnetic>
              <a
                href="#projects"
                className="cartoon-button cartoon-button-primary group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-black tracking-wide"
              >
                View my work
                <ArrowUpRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href="#contact"
                className="cartoon-button group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-black tracking-wide text-cotton"
              >
                Get in touch
              </a>
            </Magnetic>
          </div>

          <div data-hero style={{ opacity: 0 }} className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold tracking-[0.16em] text-on-surface-variant">
            <span className="mini-sticker bg-pink text-ink">IT SUPPORT</span>
            <span className="mini-sticker bg-cyan text-ink">FULL-STACK</span>
            <span className="mini-sticker bg-yellow text-ink">SYSTEMS</span>
          </div>
        </div>

        <div data-hero style={{ opacity: 0 }} className="relative min-h-[27rem] sm:min-h-[34rem] lg:min-h-[40rem] flex items-center justify-center">
          <GlobeScene reduced={reduced} location={profile.locationShort} />
        </div>
      </div>

      <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
        <div data-hero style={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-on-surface-variant/60">
          <span className="text-[10px] font-mono tracking-[0.3em]">SCROLL</span>
          <span className="w-px h-10 overflow-hidden relative">
            <span className="absolute inset-0 animate-[scrollline_1.6s_ease-in-out_infinite] bg-primary-container" />
          </span>
        </div>
      </div>
    </section>
  );
}

function About({ profile }: { profile: Profile }) {
  const facts = [
    { label: 'Name', value: profile.name },
    { label: 'Role', value: profile.primaryRole },
    { label: 'Location', value: profile.location },
    { label: 'Focus', value: profile.focus },
    { label: 'Status', value: profile.status },
  ];
  return (
    <section id="about" className="relative mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36 scroll-mt-16">
      <SectionHeading
        index="01"
        kicker="About"
        title="Infrastructure meets code."
        gradient={['code']}
      />

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-20">
        <Reveal delay={120}>
          <div className="about-copy space-y-5 text-on-surface-variant/90 leading-relaxed text-base sm:text-lg">
            <p>
              I&rsquo;m {profile.name} — {profile.primaryRole}. {profile.about}
            </p>
            <p>
              {profile.aboutSecondary}
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
              <div key={f.label} className={`flex items-center justify-between gap-6 px-6 py-4 ${index === facts.length - 1 ? 'bg-lime' : ''}`}>
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

function Skills() {
  return (
    <section id="skills" className="relative border-y border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36">
        <SectionHeading
          index="02"
          kicker="Capabilities"
          title="A toolkit built for reliability."
          gradient={['reliability']}
        />

        <RevealGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" staggerMs={110}>
          {SKILLS.map((skill, i) => (
            <div key={skill.group} className="reveal-item h-full">
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
                <h3 className="font-display font-black text-xl text-cotton mb-5 relative z-[3]">{skill.group}</h3>
                <ul className="space-y-3.5 relative z-[3]">
                  {skill.items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-on-surface-variant group/item">
                      <CheckIcon className="w-4 h-4 text-primary-container shrink-0" />
                      <span className="transition-transform duration-300 group-hover/item:translate-x-1">{item}</span>
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

type ProjectIcon = { slug: string; label: string; url: string; hex?: string; category?: string };
type Project = { name: string; url: string; title: string; desc: string; techStack: ProjectIcon[] };

const FALLBACK_PROJECTS: Project[] = [
  {
    name: 'infrastructure-operations.webp',
    url: '/foto/WhatsApp%20Image%202026-07-22%20at%2009.57.08.jpeg',
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
    url: '/foto/IMG_20260709_130641.jpg',
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
    url: '/foto/WhatsApp%20Image%202026-07-09%20at%2012.06.57.jpeg',
    title: 'Full-Stack Platforms',
    desc: 'Polished web products built from interface to database with a focus on clarity, speed, and dependable delivery.',
    techStack: [
      { slug: 'nextdotjs', label: 'Next.js', url: 'https://cdn.simpleicons.org/nextdotjs/ffffff' },
      { slug: 'typescript', label: 'TypeScript', url: 'https://cdn.simpleicons.org/typescript' },
      { slug: 'postgresql', label: 'PostgreSQL', url: 'https://cdn.simpleicons.org/postgresql' },
    ],
  },
];

function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

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
        index="03"
        kicker="Selected work"
        title="Things I&rsquo;ve shipped, lately."
        gradient={['lately']}
      />

      <div className="space-y-24 sm:space-y-32">
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
                    <ImageReveal className="absolute inset-0">
                      <SmartImage
                        src={p.url}
                        alt={`${p.title || toTitle(p.name)} preview`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        fallback={<ProjectFallback name={p.title || toTitle(p.name)} />}
                      />
                    </ImageReveal>
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      aria-hidden="true"
                    />
                  </div>
                </Tilt>
              </div>

              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className="flex items-center gap-4 font-mono text-[11px] font-bold tracking-[0.2em] text-on-surface-variant/70 mb-5">
                  <span className="project-number">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-px w-10 bg-line-strong" aria-hidden="true" />
                  <span>{p.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, '_').toLowerCase()}</span>
                </div>
                <h3 className="font-display font-black tracking-[-0.035em] text-3xl sm:text-4xl text-cotton mb-4">
                  {p.title || toTitle(p.name)}
                </h3>
                {p.desc && (
                  <p className="text-on-surface-variant/90 leading-relaxed mb-7 max-w-md text-base sm:text-lg">{p.desc}</p>
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
    img: '/foto/WhatsApp%20Image%202026-07-22%20at%2009.57.08.jpeg',
    eyebrow: '01 · The bench',
    title: 'From the workbench up.',
    body: 'Every system I touch gets the same treatment — diagnosed, stabilized, documented.',
    tags: ['Support', 'Troubleshooting', 'Maintenance'],
    accent: '#ffd84d',
  },
  {
    img: '/foto/IMG_20260709_130641.jpg',
    eyebrow: '02 · The code',
    title: 'Where maintenance meets software.',
    body: 'Support tools, dashboards, and full apps — shipped with Next.js & TypeScript.',
    tags: ['Next.js', 'TypeScript', 'Full-Stack'],
    accent: '#42dcff',
  },
  {
    img: '/foto/WhatsApp%20Image%202026-07-09%20at%2012.06.57.jpeg',
    eyebrow: '03 · On the floor',
    title: 'Hands-on support.',
    body: 'Close to the end user, on-site when it counts, calm under pressure.',
    tags: ['IT Support', 'Network', 'On-site'],
    accent: '#ff5cbb',
  },
  {
    img: '/foto/WhatsApp%20Image%202026-07-11%20at%2012.08.26.jpeg',
    eyebrow: '04 · The infrastructure',
    title: 'Keeping systems alive.',
    body: 'Servers, switches, and the connections between them — stable and monitored.',
    tags: ['Infrastructure', 'Server', 'Network'],
    accent: '#b9ff66',
  },
];

function WorldScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || reduced) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (window.innerWidth < 900) {
        track.style.transform = '';
        return;
      }
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / range));
      const travel = Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.12);
      track.style.transform = `translate3d(${(-travel * progress).toFixed(1)}px, 0, 0)`;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const onUpdate = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onUpdate, { passive: true });
    window.addEventListener('resize', onUpdate);
    return () => {
      window.removeEventListener('scroll', onUpdate);
      window.removeEventListener('resize', onUpdate);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section id="story" ref={sectionRef} className="world-section relative border-y border-line-strong scroll-mt-16">
      <div className="world-sticky sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute inset-0 world-grid pointer-events-none" aria-hidden="true" />
        <div className="absolute left-5 sm:left-8 top-24 z-20 flex items-center gap-4 font-mono text-[10px] sm:text-xs font-bold tracking-[0.22em] text-on-surface-variant">
          <span className="text-yellow">04</span>
          <span>SCROLL THE WORLD</span>
          <span className="hidden sm:block w-24 h-px bg-line-strong" />
        </div>
        <div ref={trackRef} className="world-track flex items-stretch gap-8 sm:gap-12 px-[7vw] will-change-transform">
          <article className="world-intro shrink-0 flex flex-col justify-center w-[84vw] lg:w-[62vw] xl:w-[48vw] pr-6">
            <span className="world-kicker">FIELD NOTES / 2026</span>
            <h2 className="font-display font-black tracking-[-0.055em] text-[clamp(3.4rem,8vw,7.8rem)] leading-[.9] text-cotton mt-5">
              REAL<br />WORK.<br /><span className="text-pink">REAL</span> WORLD.
            </h2>
            <p className="mt-7 max-w-lg text-on-surface-variant text-base sm:text-lg leading-relaxed">
              Drag your eyes sideways while the page moves down. A small world tour through the systems, code, and hands-on work behind every result.
            </p>
            <div className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold tracking-[.18em] text-cyan">
              KEEP SCROLLING <span className="text-2xl">→</span>
            </div>
          </article>

          {WORLD_STOPS.map((scene, index) => (
            <article
              key={scene.eyebrow}
              className={`world-card world-card-${index + 1} shrink-0 w-[84vw] sm:w-[70vw] lg:w-[56vw] xl:w-[46rem]`}
              style={{ '--scene-accent': scene.accent } as CSSProperties}
            >
              <div className="world-card-image">
                <SmartImage src={scene.img} alt={`${scene.title} — field work`} className="absolute inset-0 w-full h-full object-cover" fallback={<ProjectFallback name={scene.title} />} />
                <div className="world-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
              </div>
              <div className="world-card-copy">
                <p className="font-mono text-[10px] sm:text-xs font-bold tracking-[.18em] uppercase" style={{ color: scene.accent }}>{scene.eyebrow}</p>
                <h3 className="font-display font-black text-2xl sm:text-4xl tracking-[-.03em] text-cotton mt-3">{scene.title}</h3>
                <p className="text-on-surface-variant mt-3 leading-relaxed max-w-xl">{scene.body}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {scene.tags.map((tag) => <span key={tag} className="world-tag">{tag}</span>)}
                </div>
              </div>
            </article>
          ))}

          <article className="world-finale shrink-0 w-[84vw] lg:w-[48vw] flex flex-col items-start justify-center pr-[8vw]">
            <div className="finale-face" aria-hidden="true"><span>•</span><span>ᴗ</span><span>•</span></div>
            <p className="world-kicker mt-7">FINAL DESTINATION</p>
            <h2 className="font-display font-black tracking-[-.05em] text-4xl sm:text-6xl text-cotton mt-4">YOUR NEXT<br /><span className="text-lime">BIG THING.</span></h2>
            <a href="#contact" className="cartoon-button cartoon-button-primary inline-flex items-center gap-2 mt-8 rounded-full px-7 py-3.5 text-sm font-black">
              Let&rsquo;s make it real <ArrowUpRightIcon className="w-4 h-4" />
            </a>
          </article>
        </div>
        <div className="absolute bottom-6 left-[7vw] right-[7vw] h-1 rounded-full bg-line-strong overflow-hidden">
          <div ref={progressRef} className="h-full origin-left bg-yellow" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </section>
  );
}

function Contact({ profile }: { profile: Profile }) {
  const socials = [
    { label: 'GitHub', href: profile.github, icon: <GitHubIcon className="w-4 h-4" /> },
    { label: 'LinkedIn', href: profile.linkedin, icon: <LinkedInIcon className="w-4 h-4" /> },
    { label: 'Email', href: profile.email ? `mailto:${profile.email}` : '', icon: <MailIcon className="w-4 h-4" /> },
    { label: 'Phone', href: profile.phone ? `tel:${profile.phone.replace(/[^\d+]/g, '')}` : '', icon: <PhoneIcon className="w-4 h-4" /> },
  ].filter((social) => Boolean(social.href));
  return (
    <section id="contact" className="relative border-t border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-40">
        <SectionHeading
          index="04"
          kicker="Contact"
          title="Let&rsquo;s build something solid."
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
                {profile.availability}
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
              </div>
            </div>

            <div className="contact-action relative z-[3] flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated transparent portfolio artwork */}
              <img
                src="/assets/hilmi-workstation-island.png"
                alt="3D workstation with server, laptop, and network cables"
                className="contact-asset w-full max-w-md"
                loading="lazy"
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
        className="fixed top-0 left-0 right-0 z-[60] h-[3px] origin-left bg-primary-container"
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
      {!introReady && <CinematicLoader reduced={reduced} profile={profile} onComplete={completeIntro} />}
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
      <div className="fixed inset-0 pointer-events-none z-[1] grain" aria-hidden="true" />
      <Navbar theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />

      <main className="relative z-10">
        <Hero reduced={reduced} ready={introReady} profile={profile} />
        <Marquee items={MARQUEE_ITEMS} />
        <About profile={profile} />
        <Skills />
        <Projects />
        <WorldScroll />
        <Contact profile={profile} />
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
            Back to top
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
