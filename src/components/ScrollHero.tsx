'use client';

import { useEffect, useRef } from 'react';
import type { Profile } from '@/lib/profile';
import { LocText } from '@/lib/i18n';

/*
 * ScrollHero: scroll-scrubbed frame sequence (49 frames, camera dives into a CRT
 * monitor and lands on a "Portofolio" title screen).
 *
 * Smoothness comes from three mechanisms, not from more frames:
 *  1. Sub-frame blending: the fractional frame position draws frame N at full
 *     opacity and frame N+1 at alpha = fraction, so motion is continuous
 *     instead of 49 visible steps.
 *  2. Frame-rate independent exponential damping on the scroll position, so
 *     the camera glides identically on 60Hz and 120Hz displays.
 *  3. Every frame is fetched and decode()d up front, so the draw loop never
 *     waits on the network or the image decoder mid-scroll.
 *
 * Design notes (antislop pass):
 *  - Glass is used on exactly one surface per phase (the copy card) because
 *    the card must stay readable over a moving photographic background;
 *    controls inside the card use flat translucent fills, no nested blur.
 *  - The pink-to-cyan gradient appears once, on the headline keywords, in the
 *    site's own palette; the progress hairline is a single accent (cyan).
 *  - No em dashes in copy. CTAs point at real sections (#projects, #contact).
 */

const FRAME_COUNT = 49;
const frameSrc = (i: number) => `/hero-frames/frame_${String(i + 1).padStart(3, '0')}.jpg`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fade = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function CtaRow({ lang }: { lang: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="#projects"
        className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold tracking-wide text-[#10182b] transition-transform duration-300 hover:scale-[1.03]"
      >
        <LocText idText="Lihat karya saya" enText="View my work" lang={lang} />
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
      <a
        href="#contact"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold tracking-wide text-white transition-colors duration-300 hover:bg-white/20"
      >
        <LocText idText="Hubungi saya" enText="Get in touch" lang={lang} />
      </a>
    </div>
  );
}

function IntroCard({ profile, lang }: { profile: Profile; lang: string }) {
  return (
    <div className="max-w-2xl rounded-[2rem] border border-white/15 bg-[#0b101f]/40 px-7 py-8 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:px-10 sm:py-10">
      <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85"><LocText idText={profile.status} enText={profile.statusEn} lang={lang} /></span>
      </div>

      <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-cyan-200/90 sm:text-xs">
        {profile.name} · {profile.locationShort}
      </p>

      <h1 className="mb-5 font-display text-[clamp(2.6rem,6.2vw,4.6rem)] font-black leading-[1.02] tracking-[-0.03em] text-white">
        I keep{' '}
        <span className="bg-gradient-to-r from-[#ff5cbb] to-[#42dcff] bg-clip-text text-transparent">systems</span>{' '}
        happy &amp;{' '}
        <span className="bg-gradient-to-r from-[#ff5cbb] to-[#42dcff] bg-clip-text text-transparent">ideas</span>{' '}
        alive.
      </h1>

      <p className="mb-3 font-display text-base font-medium text-white/85 sm:text-lg"><LocText idText={profile.primaryRole} enText={profile.primaryRoleEn} lang={lang} /></p>
      <p className="mb-8 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base"><LocText idText={profile.heroIntro} enText={profile.heroIntroEn} lang={lang} /></p>

      <CtaRow lang={lang} />
    </div>
  );
}

function OutroCard({ profile, lang }: { profile: Profile; lang: string }) {
  return (
    <div className="w-full max-w-lg rounded-[1.5rem] border border-white/15 bg-[#0b101f]/45 px-6 py-6 text-center shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:px-8">
      <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200/90">
        <LocText idText={profile.focus} enText={profile.focusEn} lang={lang} />
      </p>
      <p className="mb-5 font-display text-xl font-bold leading-snug text-white sm:text-2xl">
        <LocText idText="Kamu sampai di layarnya. Karyanya tinggal satu klik lagi." enText="You made it to the screen. The work is one click away." lang={lang} />
      </p>
      <div className="flex justify-center">
        <CtaRow lang={lang} />
      </div>
    </div>
  );
}

export default function ScrollHero({ reduced, profile, lang }: { reduced: boolean; profile: Profile; lang: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const images: HTMLImageElement[] = [];
    const ready = new Array<boolean>(FRAME_COUNT).fill(false);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = frameSrc(i);
      images.push(img);
      // decode() moves JPEG/WebP decoding off the scroll path.
      img
        .decode()
        .catch(() => undefined)
        .finally(() => {
          ready[i] = true;
        });
    }

    let raf = 0;
    let current = 0;
    let lastDrawn = -1;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      lastDrawn = -1;
    };
    resize();
    window.addEventListener('resize', resize);

    const nearestReady = (idx: number) => {
      let i = idx;
      while (i > 0 && !ready[i]) i--;
      if (ready[i]) return i;
      i = idx;
      while (i < FRAME_COUNT && !ready[i]) i++;
      return i < FRAME_COUNT ? i : -1;
    };

    const drawCover = (img: HTMLImageElement, alpha: number) => {
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      ctx.globalAlpha = 1;
    };

    // Blended draw: base frame opaque, next frame at fractional alpha.
    const draw = (pos: number) => {
      const lo = Math.min(FRAME_COUNT - 1, Math.floor(pos));
      const hi = Math.min(FRAME_COUNT - 1, lo + 1);
      const frac = pos - lo;
      const loIdx = nearestReady(lo);
      if (loIdx < 0) return;
      drawCover(images[loIdx], 1);
      if (frac > 0.01 && hi !== lo) {
        const hiIdx = nearestReady(hi);
        if (hiIdx > loIdx) drawCover(images[hiIdx], frac);
      }
    };

    const applyCopy = (p: number) => {
      const intro = introRef.current;
      if (intro) {
        const o = 1 - fade(p, 0.14, 0.34);
        intro.style.opacity = o.toFixed(3);
        intro.style.transform = `translate3d(0, ${(-36 * fade(p, 0.14, 0.34)).toFixed(1)}px, 0)`;
        intro.style.pointerEvents = o < 0.05 ? 'none' : 'auto';
        intro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      const outro = outroRef.current;
      if (outro) {
        const o = fade(p, 0.7, 0.9);
        outro.style.opacity = o.toFixed(3);
        outro.style.transform = `translate3d(0, ${(24 * (1 - o)).toFixed(1)}px, 0)`;
        outro.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
        outro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      const hint = hintRef.current;
      if (hint) hint.style.opacity = (1 - fade(p, 0.01, 0.07)).toFixed(3);
      const bar = barRef.current;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    };

    const tick = (now: number) => {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom > -vh && rect.top < vh * 2) {
        const total = Math.max(1, rect.height - vh);
        const target = clamp01(-rect.top / total);
        // Exponential damping: same glide at any refresh rate.
        const k = 1 - Math.exp(-dt / 90);
        current += (target - current) * k;
        if (Math.abs(target - current) < 0.0003) current = target;
        const pos = current * (FRAME_COUNT - 1);
        if (Math.abs(pos - lastDrawn) > 0.004) {
          draw(pos);
          lastDrawn = pos;
        }
        applyCopy(current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section id="top" className="relative flex min-h-svh items-center overflow-hidden bg-[#0b101f]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameSrc(0)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b101f]/70 via-[#0b101f]/25 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[82rem] px-5 py-28 sm:px-8">
          <IntroCard profile={profile} lang={lang} />
        </div>
      </section>
    );
  }

  return (
    <section id="top" ref={sectionRef} className="relative bg-[#0b101f]" style={{ height: '400vh' }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ backgroundImage: `url(${frameSrc(0)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0b101f]/60 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#151329] via-[#151329]/35 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(5,8,18,0.42)_100%)]" aria-hidden="true" />

        <div ref={introRef} className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[82rem] px-5 sm:px-8">
            <IntroCard profile={profile} lang={lang} />
          </div>
        </div>

        <div ref={outroRef} className="absolute inset-x-0 bottom-[6%] flex justify-center px-5" style={{ opacity: 0, visibility: 'hidden' }}>
          <OutroCard profile={profile} lang={lang} />
        </div>

        <div ref={hintRef} className="pointer-events-none absolute bottom-9 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.32em]"><LocText idText="Scroll untuk masuk" enText="Scroll to dive in" lang={lang} /></span>
          <span className="relative block h-9 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollhint_1.6s_ease-in-out_infinite] bg-white/80" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10" aria-hidden="true">
          <div ref={barRef} className="h-full w-full origin-left bg-[#42dcff]" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes scrollhint {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(220%);
          }
        }
      `}</style>
    </section>
  );
}
