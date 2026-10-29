'use client';

import { useEffect, useRef, useState } from 'react';
import type { Profile } from '@/lib/profile';
import { LocText } from '@/lib/i18n';

/*
 * ScrollHero: scroll-scrubbed frame sequence (49 frames, camera dives into a
 * CRT monitor and lands on a "Portofolio" title screen).
 *
 * The frame engine is unchanged: sub-frame blending, frame-rate independent
 * exponential damping, and every frame decode()d up front.
 *
 * Layout (2026 redesign): the monitor is the hero object and the UI frames it.
 *  - At rest the canvas is shifted right and slightly scaled so the monitor
 *    sits in the right half of the viewport; the offset eases back to zero by
 *    SHIFT_SETTLE progress so the zoom ends perfectly centred.
 *  - Copy lives in a plain left column over a left-to-right scrim, no card.
 *  - Scene B is a borderless "terminal dock" in the lower third of the glass.
 *  - One progress indicator only: the site-wide gradient hairline at the top
 *    of the page (this component draws no bar of its own).
 */

// ---------------------------------------------------------------------------
// Tuning knobs. MONITOR_* describe where the monitor sits in the frames: it
// is assumed to be horizontally centred (~50% of the frame width) in frame 1,
// so shifting the canvas right by MONITOR_SHIFT_X of the viewport width puts
// its centre near 66% of the viewport. SCRIM_OPACITY is mirrored by the
// --hero-scrim-opacity CSS variable in globals.css.
// ---------------------------------------------------------------------------
const MONITOR_SHIFT_X = 0.16;
const MONITOR_SCALE = 1.08;
const SHIFT_SETTLE = 0.35;
const INTRO_FADE_END = 0.4;
const DOCK_START = 0.75;
const DOCK_FADE_END = 0.88;

const FRAME_COUNT = 49;
const frameSrc = (i: number) => `/hero-frames/frame_${String(i + 1).padStart(3, '0')}.jpg`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fade = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

const CTA_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff33] focus-visible:ring-offset-2 focus-visible:ring-offset-black';

/** The one CTA pair used by both the hero copy and the scene-B dock. */
function CtaRow({ lang, compact = false }: { lang: string; compact?: boolean }) {
  const height = compact ? 'h-11' : 'h-[52px]';
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <a
        href="#projects"
        className={`group inline-flex ${height} w-full items-center justify-center gap-2 rounded-full bg-[#c6ff33] px-6 text-sm font-black tracking-wide text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_36px_-8px_rgba(198,255,51,0.55)] sm:w-auto ${CTA_FOCUS}`}
      >
        <LocText idText="Lihat karya saya" enText="View my work" lang={lang} />
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
      <a
        href="#contact"
        className={`inline-flex ${height} w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 text-sm font-bold tracking-wide text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/15 sm:w-auto ${CTA_FOCUS}`}
      >
        <LocText idText="Hubungi saya" enText="Get in touch" lang={lang} />
      </a>
    </div>
  );
}

/** Scene A copy: bare text column, hierarchy by type scale only. */
function IntroCopy({ profile, lang }: { profile: Profile; lang: string }) {
  return (
    <div className="max-w-[560px]">
      <div className="hero-load flex flex-wrap items-center gap-x-4 gap-y-3" style={{ animationDelay: '0ms' }}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c6ff33] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c6ff33]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
            <LocText idText={profile.status} enText={profile.statusEn} lang={lang} />
          </span>
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#c6ff33]">
          {profile.name} · {profile.locationShort}
        </span>
      </div>

      <h1
        className="hero-load mt-6 font-display text-[clamp(40px,5.4vw,88px)] font-black leading-[1.02] tracking-[-0.03em] text-white"
        style={{ animationDelay: '70ms' }}
      >
        {lang === 'id' ? (
          <>
            Saya menjaga{' '}
            <span className="bg-gradient-to-r from-[#7d39eb] to-[#c6ff33] bg-clip-text text-transparent">sistem</span>{' '}
            tetap sehat &amp;{' '}
            <span className="bg-gradient-to-r from-[#7d39eb] to-[#c6ff33] bg-clip-text text-transparent">ide</span>{' '}
            tetap hidup.
          </>
        ) : lang === 'en' ? (
          <>
            I keep{' '}
            <span className="bg-gradient-to-r from-[#7d39eb] to-[#c6ff33] bg-clip-text text-transparent">systems</span>{' '}
            happy &amp;{' '}
            <span className="bg-gradient-to-r from-[#7d39eb] to-[#c6ff33] bg-clip-text text-transparent">ideas</span>{' '}
            alive.
          </>
        ) : (
          <LocText idText="Saya menjaga sistem tetap sehat & ide tetap hidup." enText="I keep systems happy & ideas alive." lang={lang} />
        )}
      </h1>

      <p className="hero-load mt-5 font-display text-xl font-medium text-white/90 sm:text-2xl" style={{ animationDelay: '140ms' }}>
        <LocText idText={profile.primaryRole} enText={profile.primaryRoleEn} lang={lang} />
      </p>

      <p className="hero-load mt-4 line-clamp-2 max-w-[46ch] text-base leading-relaxed text-white/75" style={{ animationDelay: '210ms' }}>
        <LocText idText={profile.heroIntro} enText={profile.heroIntroEn} lang={lang} />
      </p>

      <div className="hero-load mt-8" style={{ animationDelay: '280ms' }}>
        <CtaRow lang={lang} />
      </div>
    </div>
  );
}

/** Scene B: terminal dock inside the lower third of the CRT glass. */
function TerminalDock({ profile, lang, shown }: { profile: Profile; lang: string; shown: boolean }) {
  return (
    <div
      className="dock-wrap w-full max-w-[620px] border-t border-white/[0.12] px-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-left sm:px-2"
      data-on={shown ? 'true' : 'false'}
      style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.55), rgba(7,11,20,0) 88%)' }}
    >
      <p className="dock-line font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-[#c6ff33]">
        <LocText idText={profile.focus} enText={profile.focusEn} lang={lang} />
      </p>
      <p className="dock-line mt-3 font-display text-[clamp(20px,2.4vw,36px)] font-bold leading-[1.15] text-white">
        <LocText idText="Kamu sampai di layarnya. Karyanya tinggal satu klik lagi." enText="You made it to the screen. The work is one click away." lang={lang} />
      </p>
      <div className="dock-line mt-5">
        <CtaRow lang={lang} compact />
      </div>
    </div>
  );
}

const HERO_MOTION_CSS = `
  .hero-load { opacity: 0; animation: heroLoad 600ms cubic-bezier(.22,1,.36,1) forwards; }
  @keyframes heroLoad { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .dock-line { opacity: 0; transform: translateY(16px); transition: opacity 600ms cubic-bezier(.22,1,.36,1), transform 600ms cubic-bezier(.22,1,.36,1); }
  .dock-wrap[data-on='true'] .dock-line { opacity: 1; transform: translateY(0); }
  .dock-wrap[data-on='true'] .dock-line:nth-child(2) { transition-delay: 60ms; }
  .dock-wrap[data-on='true'] .dock-line:nth-child(3) { transition-delay: 120ms; }
  .hint-line { display: block; width: 56px; height: 1px; background: rgba(198,255,51,.85); transform-origin: left center; animation: hintLine 1.8s cubic-bezier(.22,1,.36,1) infinite; }
  @keyframes hintLine { 0% { transform: scaleX(.25); opacity: .45; } 50% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(.25); opacity: .45; } }
  @media (prefers-reduced-motion: reduce) {
    .hero-load { animation: none; opacity: 1; }
    .dock-line { transition: none; }
    .hint-line { animation: none; }
  }
`;

export default function ScrollHero({ reduced, profile, lang }: { reduced: boolean; profile: Profile; lang: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [dockShown, setDockShown] = useState(false);
  const dockShownRef = useRef(false);

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
      // decode() moves JPEG decoding off the scroll path.
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
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Canvas framing: desktop eases the monitor from the right half back to
      // centre; smaller screens use a fixed upward shift so the monitor sits
      // in the top zone and the copy owns the bottom.
      const wrap = canvasWrapRef.current;
      if (wrap) {
        let transform: string;
        if (vw >= 1024) {
          const e = smooth(fade(p, 0, SHIFT_SETTLE));
          const tx = MONITOR_SHIFT_X * vw * (1 - e);
          const sc = 1 + (MONITOR_SCALE - 1) * (1 - e);
          transform = `translate3d(${tx.toFixed(1)}px, 0, 0) scale(${sc.toFixed(4)})`;
        } else if (vw >= 768) {
          transform = `translate3d(0, ${(-0.1 * vh).toFixed(1)}px, 0) scale(1.06)`;
        } else {
          transform = `translate3d(0, ${(-0.14 * vh).toFixed(1)}px, 0) scale(1.12)`;
        }
        if (wrap.style.transform !== transform) wrap.style.transform = transform;
      }

      const intro = introRef.current;
      if (intro) {
        const e = smooth(fade(p, 0, INTRO_FADE_END));
        const o = 1 - e;
        intro.style.opacity = o.toFixed(3);
        intro.style.transform = `translate3d(0, ${(-40 * e).toFixed(1)}px, 0)`;
        intro.style.pointerEvents = o < 0.1 ? 'none' : 'auto';
        intro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }

      const hint = hintRef.current;
      if (hint) {
        const o = 1 - fade(p, 0, 0.05);
        hint.style.opacity = o.toFixed(3);
        hint.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }

      const outro = outroRef.current;
      if (outro) {
        const o = fade(p, DOCK_START, DOCK_FADE_END);
        outro.style.opacity = o.toFixed(3);
        outro.style.transform = `translate3d(0, ${(16 * (1 - o)).toFixed(1)}px, 0)`;
        outro.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
        outro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      const ds = p >= DOCK_START;
      if (ds !== dockShownRef.current) {
        dockShownRef.current = ds;
        setDockShown(ds);
      }
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
      <>
        <section id="top" className="relative flex min-h-dvh items-end overflow-hidden bg-[#050208] lg:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frameSrc(0)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="hero-scrim" aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-12 px-[clamp(20px,5vw,80px)] py-24">
            <div className="col-span-12 lg:col-span-5">
              <IntroCopy profile={profile} lang={lang} />
            </div>
          </div>
        </section>
        <style jsx>{HERO_MOTION_CSS}</style>
      </>
    );
  }

  return (
    <>
      <section id="top" ref={sectionRef} className="relative h-[400svh] bg-[#0b101f]">
        <div className="sticky top-0 h-dvh overflow-hidden">
          <div ref={canvasWrapRef} className="absolute inset-0 will-change-transform">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 block h-full w-full"
              style={{ backgroundImage: `url(${frameSrc(0)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              aria-hidden="true"
            />
          </div>

          <div className="hero-scrim" aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(2,0,8,0.45)_100%)]"
            aria-hidden="true"
          />

          <div ref={introRef} className="absolute inset-0">
            <div className="mx-auto grid h-full w-full max-w-[1280px] grid-cols-12 items-end px-[clamp(20px,5vw,80px)] pb-28 lg:items-center lg:pb-0">
              <div className="col-span-12 lg:col-span-5">
                <IntroCopy profile={profile} lang={lang} />
              </div>
            </div>
          </div>

          <div
            ref={outroRef}
            className="absolute inset-x-0 bottom-[3.5svh] flex justify-center px-4 lg:bottom-[9svh]"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <TerminalDock profile={profile} lang={lang} shown={dockShown} />
          </div>

          <div
            ref={hintRef}
            className="pointer-events-none absolute bottom-8 left-[clamp(20px,5vw,80px)] hidden items-center gap-3 text-white/75 sm:flex"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.32em]">
              <LocText idText="Scroll untuk masuk" enText="Scroll to enter" lang={lang} />
            </span>
            <span className="hint-line" aria-hidden="true" />
          </div>
        </div>

        <style jsx>{HERO_MOTION_CSS}</style>
      </section>

      {/* Clean 120px blend from the hero into the page background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-10 -mt-[120px] h-[120px]"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0), var(--color-surface))' }}
      />
    </>
  );
}
