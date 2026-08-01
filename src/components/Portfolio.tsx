'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode, SVGProps } from 'react';
import { animate, onScroll, stagger } from 'animejs';
import type { JSAnimation, ScrollObserver } from 'animejs';

const GH_RAW = '/api/images/port';

const NAV = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Work', href: '#projects' },
  { label: 'Contact', href: '#contact' },
];

const ROLES = ['IT Support Specialist', 'Full-Stack Developer', 'Systems Administrator'];

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

const FACTS = [
  { label: 'Name', value: 'M. Hilmi Firjatullah Adi' },
  { label: 'Role', value: 'IT Support & Full-Stack Developer' },
  { label: 'Location', value: 'Kendari, Indonesia' },
  { label: 'Focus', value: 'Infrastructure · Cloud · Web' },
  { label: 'Status', value: 'Open to work', accent: true },
];

const STATS = [
  { to: 6, suffix: '+', label: 'Years in IT' },
  { to: 2, suffix: '+', label: 'Projects shipped' },
  { to: 14, suffix: '+', label: 'Technologies' },
  { to: 24, suffix: '/7', label: 'Support uptime' },
];

const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/MHFADev', icon: <GitHubIcon className="w-4 h-4" /> },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/mhilmifa', icon: <LinkedInIcon className="w-4 h-4" /> },
  { label: 'Email', href: 'mailto:m.hilmi@example.com', icon: <MailIcon className="w-4 h-4" /> },
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
        if (entries[0].isIntersecting && !anim) {
          anim = animate(el, {
            opacity: [0, 1],
            translateY: [y, 0],
            duration: 1000,
            delay,
            ease: 'outExpo',
          });
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
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
        if (entries[0].isIntersecting && !anim) {
          anim = animate(items, {
            opacity: [0, 1],
            translateY: [y, 0],
            duration: 900,
            delay: stagger(staggerMs, { start: delay }),
            ease: 'outExpo',
          });
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
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
    return <img src={src} alt={alt} className={className} loading="lazy" />;
  }
  if (status === 'error' && fallback) {
    return <>{fallback}</>;
  }
  return <div className={className} aria-hidden="true" style={{ background: 'var(--color-surface-container-high)' }} />;
}

function SectionHeading({
  index,
  kicker,
  title,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <Reveal className="mb-14 sm:mb-20">
      <div>
        <div className="flex items-center gap-4 font-mono text-xs tracking-[0.25em] uppercase text-on-surface-variant/70 mb-5">
          <span className="text-primary-container font-semibold">{index}</span>
          <span>{kicker}</span>
          <span className="h-px flex-1 bg-line-strong" />
        </div>
        <h2 className="font-display font-semibold tracking-[-0.02em] text-cotton text-3xl sm:text-5xl leading-[1.08] max-w-2xl">
          {title}
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
          <a href="#top" className="font-display font-bold text-lg text-cotton tracking-tight">
            hilmi<span className="text-primary-container">.</span>
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
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-primary-container text-on-primary-container px-5 py-2.5 text-sm font-semibold hover:opacity-90"
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

function Hero({ reduced }: { reduced: boolean }) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
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
  }, [reduced]);

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
    <section id="top" ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 grid-bg grid-fade pointer-events-none" aria-hidden="true" />
      <div
        data-parallax="0.35"
        className="absolute -top-44 -right-32 w-[42rem] h-[42rem] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary-container) 20%, transparent) 0%, transparent 68%)' }}
        aria-hidden="true"
      />
      <div
        data-parallax="0.18"
        className="absolute bottom-[-32%] left-[-18%] w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 14%, transparent) 0%, transparent 68%)' }}
        aria-hidden="true"
      />
      <div
        data-bob
        className="absolute top-[20%] right-[22%] w-32 h-32 rounded-full border border-line-strong pointer-events-none"
        aria-hidden="true"
      />
      <div
        data-bob
        className="absolute bottom-[24%] left-[10%] w-20 h-20 rounded-full border border-line-strong pointer-events-none"
        style={{ animationDelay: '-2.1s' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 w-full grid lg:grid-cols-[1.5fr_1fr] gap-14 lg:gap-20 items-center py-24 sm:py-32">
        <div>
          <div
            data-hero
            style={{ opacity: 0 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-surface-container/60 px-4 py-1.5 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-active opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-active" />
            </span>
            <span className="text-xs font-medium tracking-wide text-on-surface-variant">
              Available for work — IT Support & Development
            </span>
          </div>

          <h1 className="font-display font-semibold tracking-[-0.03em] leading-[1.02] text-[clamp(3rem,9vw,6.25rem)] text-cotton mb-7">
            <span data-hero style={{ opacity: 0 }} className="block overflow-hidden">
              <span className="block">M. Hilmi</span>
            </span>
            <span data-hero style={{ opacity: 0 }} className="block overflow-hidden">
              <span className="block text-gradient">Firjatullah Adi</span>
            </span>
          </h1>

          <p data-hero style={{ opacity: 0 }} className="font-display font-medium text-lg sm:text-xl text-on-surface-variant mb-5">
            <RoleRotator roles={ROLES} />
          </p>

          <p data-hero style={{ opacity: 0 }} className="text-base sm:text-lg text-on-surface-variant/90 max-w-xl leading-relaxed mb-10">
            Bridging infrastructure and code — turning complex systems into seamless solutions.
          </p>

          <div data-hero style={{ opacity: 0 }} className="flex flex-wrap items-center gap-4 mb-12">
            <Magnetic>
              <a
                href="#projects"
                className="group inline-flex items-center gap-2.5 rounded-full bg-primary-container text-on-primary-container px-7 py-3.5 text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity"
                style={{ boxShadow: '0 10px 32px -10px color-mix(in srgb, var(--color-primary-container) 55%, transparent)' }}
              >
                View my work
                <ArrowUpRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href="#contact"
                className="group inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-surface-container/40 px-7 py-3.5 text-sm font-semibold tracking-wide text-cotton hover:border-primary-container/60 hover:text-primary-container transition-colors"
              >
                Get in touch
              </a>
            </Magnetic>
          </div>

          <div data-hero style={{ opacity: 0 }} className="flex items-center gap-5 font-mono text-xs text-on-surface-variant/70">
            <span className="text-primary-container">~/hilmi</span>
            <span className="h-px w-8 bg-line-strong" aria-hidden="true" />
            <span className="tracking-[0.2em]">IT · DEV · SYSTEMS</span>
          </div>
        </div>

        <div data-parallax="0.08" className="relative mx-auto w-60 sm:w-72 lg:w-80">
          <div
            className="absolute -inset-3 rounded-[1.75rem] border border-primary-container/30 rotate-3 pointer-events-none"
            aria-hidden="true"
          />
          <div
            data-hero
            style={{ opacity: 0 }}
            className="relative rounded-2xl overflow-hidden border border-line-strong bg-surface-container aspect-[4/5]"
          >
            <SmartImage
              src={`${GH_RAW}/profile.jpg`}
              alt="Portrait of M. Hilmi Firjatullah Adi"
              className="absolute inset-0 w-full h-full object-cover"
              fallback={<ProfileFallback />}
            />
          </div>
          <div
            data-hero
            style={{ opacity: 0 }}
            className="mt-4 flex items-center justify-between font-mono text-[11px] text-on-surface-variant/70"
          >
            <span>$ whoami</span>
            <span className="text-primary-container">M. Hilmi F.A.</span>
          </div>
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

function About() {
  return (
    <section id="about" className="relative mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36 scroll-mt-16">
      <SectionHeading
        index="01"
        kicker="About"
        title={
          <>
            Infrastructure meets <span className="text-gradient">code</span>.
          </>
        }
      />

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-20">
        <Reveal delay={120}>
          <div className="space-y-5 text-on-surface-variant/90 leading-relaxed">
            <p>
              I&rsquo;m M. Hilmi Firjatullah Adi — an IT support specialist and full-stack developer. I keep systems
              running, diagnose the tricky ones, and build the tools that make operations easier.
            </p>
            <p>
              Working across infrastructure and software, I turn messy, complex environments into stable,
              well-documented ones. From network admin to shipping Next.js applications — the goal is always the
              same: seamless, dependable results.
            </p>
          </div>

          <RevealGroup className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 mt-12" staggerMs={100}>
            {STATS.map((s) => (
              <div key={s.label} className="reveal-item">
                <div className="font-display font-semibold text-3xl sm:text-4xl text-cotton">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="text-xs text-on-surface-variant/70 mt-1.5">{s.label}</div>
              </div>
            ))}
          </RevealGroup>
        </Reveal>

        <Reveal delay={240}>
          <dl className="border border-line-strong rounded-2xl bg-surface-container/50 divide-y divide-line overflow-hidden">
            {FACTS.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-6 px-6 py-4">
                <dt className="font-mono text-[10px] tracking-[0.2em] text-on-surface-variant/60 uppercase">
                  {f.label}
                </dt>
                <dd className={`text-sm font-medium text-right ${f.accent ? 'text-active' : 'text-cotton'}`}>
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
          title={
            <>
              A toolkit built for <span className="text-gradient">reliability</span>.
            </>
          }
        />

        <RevealGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" staggerMs={110}>
          {SKILLS.map((skill, i) => (
            <div
              key={skill.group}
              className="reveal-item group relative rounded-2xl border border-line-strong bg-surface-container/60 p-8 h-full overflow-hidden hover:border-primary-container/50"
            >
              <div
                className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-primary-container to-secondary transition-all duration-500 group-hover:w-full"
                aria-hidden="true"
              />
              <div className="flex items-center justify-between mb-8">
                <span className="w-11 h-11 rounded-xl border border-line-strong bg-surface-container-high/60 flex items-center justify-center text-primary-container">
                  {skill.icon}
                </span>
                <span className="font-mono text-[10px] tracking-[0.25em] text-on-surface-variant/50 uppercase">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-display font-semibold text-lg text-cotton mb-5">{skill.group}</h3>
              <ul className="space-y-3.5">
                {skill.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <CheckIcon className="w-4 h-4 text-primary-container shrink-0" />
                    <span className="transition-transform duration-300 group-hover:translate-x-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function toTitle(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type Project = { name: string; url: string; title: string; desc: string };

function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => live && setProjects(Array.isArray(list) ? list : []))
      .catch(() => live && setProjects([]));
    return () => {
      live = false;
    };
  }, []);

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-36 scroll-mt-16">
      <SectionHeading
        index="03"
        kicker="Selected work"
        title={
          <>
            Things I&rsquo;ve shipped, <span className="text-gradient">lately</span>.
          </>
        }
      />

      <div className="space-y-24 sm:space-y-32">
        {projects?.map((p, i) => (
          <Reveal key={p.name} delay={60}>
            <article className="group relative grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div className={`relative ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div
                  className="absolute -inset-3 rounded-[1.75rem] border border-line bg-gradient-to-br from-primary-container/15 to-transparent rotate-2 pointer-events-none transition-transform duration-700 group-hover:rotate-0"
                  aria-hidden="true"
                />
                <div className="relative rounded-2xl overflow-hidden border border-line-strong bg-surface-container aspect-[16/11]">
                  <SmartImage
                    src={p.url}
                    alt={`${p.title || toTitle(p.name)} preview`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    fallback={<ProjectFallback name={p.title || toTitle(p.name)} />}
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.2em] text-on-surface-variant/60 mb-5">
                  <span className="text-primary-container font-semibold">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-px w-10 bg-line-strong" aria-hidden="true" />
                  <span>{p.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, '_').toLowerCase()}</span>
                </div>
                <h3 className="font-display font-semibold tracking-[-0.02em] text-2xl sm:text-3xl text-cotton mb-4">
                  {p.title || toTitle(p.name)}
                </h3>
                {p.desc && (
                  <p className="text-on-surface-variant/90 leading-relaxed mb-7 max-w-md">{p.desc}</p>
                )}
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

function Contact() {
  return (
    <section id="contact" className="relative border-t border-line-strong bg-surface-container/25 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-28 sm:py-40">
        <SectionHeading
          index="04"
          kicker="Contact"
          title={
            <>
              Let&rsquo;s build something <span className="text-gradient">solid</span>.
            </>
          }
        />

        <Reveal delay={120}>
          <div className="relative rounded-3xl border border-line-strong bg-surface-container/50 p-8 sm:p-14 flex flex-col lg:flex-row lg:items-end justify-between gap-10 overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary-container) 16%, transparent) 0%, transparent 68%)' }}
              aria-hidden="true"
            />
            <div className="relative max-w-xl">
              <p className="text-on-surface-variant/90 leading-relaxed mb-8">
                Open for freelance, contract, and full-time roles — remote or based in Kendari. If you have a system
                to stabilize or a product to ship, I&rsquo;d love to hear about it.
              </p>
              <div className="flex flex-wrap gap-3">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith('http') ? '_blank' : undefined}
                    rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-surface-container/60 px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:text-primary-container hover:border-primary-container/50 transition-colors"
                  >
                    {s.icon}
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            <Magnetic strength={0.25}>
              <a
                href="mailto:m.hilmi@example.com"
                className="group relative inline-flex items-center gap-3 rounded-full bg-primary-container text-on-primary-container px-8 py-5 text-base font-semibold hover:opacity-90 transition-opacity"
                style={{ boxShadow: '0 14px 40px -12px color-mix(in srgb, var(--color-primary-container) 60%, transparent)' }}
              >
                Start a conversation
                <ArrowUpRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Magnetic>
          </div>
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
  const reduced = useReducedMotion();

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

  return (
    <div className="min-h-screen text-on-surface relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-[-22%] right-[-12%] w-[58vw] h-[58vw] rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary-container) 9%, transparent) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-[-26%] left-[-14%] w-[52vw] h-[52vw] rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 7%, transparent) 0%, transparent 65%)' }}
        />
      </div>

      <ScrollChrome />
      <Navbar theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />

      <main className="relative z-10">
        <Hero reduced={reduced} />
        <Marquee items={MARQUEE_ITEMS} />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>

      <footer className="relative z-10 border-t border-line-strong">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary-container" aria-hidden="true" />
            <span className="font-display font-semibold text-cotton">
              hilmi<span className="text-primary-container">.</span>my.id
            </span>
          </div>
          <p className="font-mono text-[11px] text-on-surface-variant/60 text-center">
            © 2026 M. Hilmi Firjatullah Adi — Built with Next.js & anime.js
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

function ProfileFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-dim">
      <div className="w-16 h-16 rounded-full border border-primary-container/40 flex items-center justify-center font-display font-bold text-xl text-primary-container">
        MH
      </div>
      <span className="font-mono text-[10px] tracking-[0.2em] text-on-surface-variant/60">PHOTO UNAVAILABLE</span>
    </div>
  );
}

function ProjectFallback({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-dim">
      <span className="font-display font-bold text-4xl sm:text-5xl text-primary-container/25 tracking-tight select-none">
        {name}
      </span>
      <span className="font-mono text-[10px] tracking-[0.25em] text-on-surface-variant/50">
        PREVIEW UNAVAILABLE
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
