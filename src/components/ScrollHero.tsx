'use client';

import { useEffect, useRef } from 'react';
import type { Profile } from '@/lib/profile';

const FRAME_COUNT = 60;
const frameSrc = (i: number) => `/hero-frames/frame_${String(i + 1).padStart(3, '0')}.webp`;

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

function HeroCopy({ profile, variant }: { profile: Profile; variant: 'intro' | 'outro' }) {
  if (variant === 'outro') {
    return (
      <div className="mx-auto max-w-xl rounded-[1.75rem] border border-white/15 bg-white/[0.07] px-7 py-7 sm:px-9 sm:py-8 text-center shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200/90 mb-3">
          {profile.focus}
        </p>
        <p className="font-display text-2xl sm:text-[1.7rem] font-bold leading-snug text-white mb-6">
          Dive in — the work speaks for itself.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#projects"
            className="group inline-flex items-center gap-2 rounded-full bg-white text-[#10182b] px-6 py-3 text-sm font-bold tracking-wide transition-transform duration-300 hover:scale-[1.03]"
          >
            View my work
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-sm font-bold tracking-wide text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/[0.14]"
          >
            Get in touch
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-[2rem] border border-white/15 bg-[#0b101f]/[0.38] px-7 py-8 sm:px-10 sm:py-10 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
      <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 mb-7 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
        </span>
        <span className="text-[11px] font-bold tracking-[0.14em] text-white/85 uppercase">
          {profile.status}
        </span>
      </div>

      <p className="font-mono text-[11px] sm:text-xs font-bold tracking-[0.26em] text-cyan-200/90 uppercase mb-4">
        {profile.name} · {profile.locationShort}
      </p>

      <h1 className="font-display font-black tracking-[-0.03em] leading-[1.02] text-[clamp(2.6rem,6.2vw,4.6rem)] text-white mb-5">
        I keep{' '}
        <span className="bg-gradient-to-r from-[#ff5cbb] to-[#42dcff] bg-clip-text text-transparent">systems</span>{' '}
        happy &amp;{' '}
        <span className="bg-gradient-to-r from-[#42dcff] to-[#b9ff66] bg-clip-text text-transparent">ideas</span>{' '}
        alive.
      </h1>

      <p className="font-display text-base sm:text-lg font-medium text-white/85 mb-3">
        {profile.primaryRole}
      </p>
      <p className="text-sm sm:text-base leading-relaxed text-white/65 max-w-lg mb-8">
        {profile.heroIntro}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="#projects"
          className="group inline-flex items-center gap-2 rounded-full bg-white text-[#10182b] px-6 py-3 text-sm font-bold tracking-wide transition-transform duration-300 hover:scale-[1.03]"
        >
          View my work
          <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-sm font-bold tracking-wide text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/[0.14]"
        >
          Get in touch
        </a>
      </div>
    </div>
  );
}

export default function ScrollHero({ reduced, profile }: { reduced: boolean; profile: Profile }) {
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
    const loaded = new Array<boolean>(FRAME_COUNT).fill(false);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        loaded[i] = true;
      };
      images.push(img);
    }
    // First frame first (it is the poster), then stream the rest in order.
    images[0].src = frameSrc(0);
    const stream = window.setTimeout(() => {
      for (let i = 1; i < FRAME_COUNT; i++) images[i].src = frameSrc(i);
    }, 60);

    let raf = 0;
    let current = 0;
    let drawnFrame = -1;
    let cw = 0;
    let ch = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      cw = canvas.clientWidth;
      ch = canvas.clientHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      drawnFrame = -1;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (idx: number) => {
      // Nearest loaded frame at or before the target; fall back to any loaded frame.
      let i = idx;
      while (i > 0 && !loaded[i]) i--;
      if (!loaded[i]) {
        i = idx;
        while (i < FRAME_COUNT && !loaded[i]) i++;
        if (i >= FRAME_COUNT) return;
      }
      const img = images[i];
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      drawnFrame = idx;
    };

    const applyCopy = (p: number) => {
      const intro = introRef.current;
      if (intro) {
        const o = 1 - fade(p, 0.16, 0.36);
        intro.style.opacity = o.toFixed(3);
        intro.style.transform = `translate3d(0, ${(-36 * fade(p, 0.16, 0.36)).toFixed(1)}px, 0)`;
        intro.style.pointerEvents = o < 0.05 ? 'none' : 'auto';
        intro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      const outro = outroRef.current;
      if (outro) {
        const o = fade(p, 0.66, 0.86);
        outro.style.opacity = o.toFixed(3);
        outro.style.transform = `translate3d(0, ${(28 * (1 - o)).toFixed(1)}px, 0)`;
        outro.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
        outro.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      const hint = hintRef.current;
      if (hint) hint.style.opacity = (1 - fade(p, 0.01, 0.07)).toFixed(3);
      const bar = barRef.current;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    };

    const tick = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom > -vh && rect.top < vh * 2) {
        const total = Math.max(1, rect.height - vh);
        const target = clamp01(-rect.top / total);
        current += (target - current) * 0.14;
        if (Math.abs(target - current) < 0.0004) current = target;
        const frame = Math.round(current * (FRAME_COUNT - 1));
        if (frame !== drawnFrame || !loaded[frame]) draw(frame);
        applyCopy(current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(stream);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section id="top" className="relative flex min-h-svh items-center overflow-hidden bg-[#0b101f]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameSrc(0)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b101f]/70 via-[#0b101f]/25 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[82rem] px-5 sm:px-8 py-28">
          <HeroCopy profile={profile} variant="intro" />
        </div>
      </section>
    );
  }

  return (
    <section id="top" ref={sectionRef} className="relative bg-[#0b101f]" style={{ height: '340vh' }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ backgroundImage: `url(${frameSrc(0)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          aria-hidden="true"
        />
        {/* Legibility gradients: soften top (navbar) and bottom (blend into the page). */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0b101f]/60 to-transparent pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#151329] via-[#151329]/35 to-transparent pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(5,8,18,0.42)_100%)] pointer-events-none" aria-hidden="true" />

        {/* Intro copy — present at the top of the zoom, drifts away as you dive in. */}
        <div ref={introRef} className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[82rem] px-5 sm:px-8">
            <HeroCopy profile={profile} variant="intro" />
          </div>
        </div>

        {/* Outro copy — arrives once the camera reaches the screen. */}
        <div ref={outroRef} className="absolute inset-x-0 bottom-[13%] flex justify-center px-5" style={{ opacity: 0, visibility: 'hidden' }}>
          <HeroCopy profile={profile} variant="outro" />
        </div>

        {/* Scroll hint */}
        <div ref={hintRef} className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/70 pointer-events-none">
          <span className="text-[10px] font-mono font-bold tracking-[0.32em] uppercase">Scroll to dive in</span>
          <span className="block w-px h-9 overflow-hidden relative bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-white/80 animate-[scrollhint_1.6s_ease-in-out_infinite]" />
          </span>
        </div>

        {/* Progress hairline */}
        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10" aria-hidden="true">
          <div ref={barRef} className="h-full w-full origin-left bg-gradient-to-r from-[#ff5cbb] via-[#42dcff] to-[#b9ff66]" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes scrollhint {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(220%); }
        }
      `}</style>
    </section>
  );
}
