# M. Hilmi F.A. — Portfolio

A colorful, motion-led portfolio for an IT Support specialist and Full-Stack Developer. The experience combines oversized editorial typography, a cursor-reactive loading sequence, responsive horizontal world-scroll storytelling, interactive tilt effects, and accessible reduced-motion fallbacks.

## Highlights

- **Scroll-scrubbed hero**: a 49-frame camera dive into a CRT monitor (original JPG frames in `public/hero-frames/`), rendered on canvas with sub-frame blending and frame-rate independent damping, wrapped in a minimalist glassmorphism layout.
- **Auto-translation**: content written in Indonesian in the admin panel is translated to English automatically on save and stored alongside the original. Visitors get the site in their region's language automatically (Indonesian and English built in, other languages machine-translated on the fly), with a manual language switcher in the navbar.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Content setup

Copy `.env.example` to `.env.local` and configure the image repository variables to load live project images, profile details, and tech-stack data. `IMAGE_REPO_URL` accepts either the repository URL (`https://github.com/OWNER/REPO`) or a GitHub folder URL (`https://github.com/OWNER/REPO/tree/main/public/foto`). The fine-grained GitHub token needs repository Contents read/write access; it is the value for `IMAGE_REPO_PAT`, not `public/foto` and not a repository URL. Set `IMAGE_PROJECT_PATH=public/foto` when the files live in that folder. The dashboard writes profile data, global technologies, project descriptions, and project-specific tech stacks to `<IMAGE_PROJECT_PATH>/meta.json`. Without these variables, the public portfolio uses polished local fallback content.

## Auto-translation

Content written in Indonesian in the admin panel is translated to English on save and stored next to the original; visitors whose language is neither English nor Indonesian get runtime translations. Translation runs through a provider chain, in order:

1. **OpenRouter (recommended)** — set `OPENROUTER_API_KEY` in the Vercel environment variables to translate everything with free LLM models (near-human quality, all languages). Admin saves batch all fields into a single request to stay inside free-tier limits. `OPENROUTER_MODEL` optionally overrides the default free-model routing.
2. **LibreTranslate** — set `LIBRETRANSLATE_URL` to a self-hosted instance for a fully open-source, quota-free path.
3. **Google Translate free endpoint**, then **MyMemory** — no-key fallbacks (`MYMEMORY_EMAIL` raises the free quota).

With no variables set, the no-key fallbacks still work; every provider failure falls back to the original text.

Status: OpenRouter provider enabled (`OPENROUTER_API_KEY` configured in Vercel).

## Quality checks

```bash
npm run lint
npm run build
```

Built with Next.js 16, React 19, Tailwind CSS 4, and anime.js.
