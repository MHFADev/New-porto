# M. Hilmi F.A. — Portfolio

A colorful, motion-led portfolio for an IT Support specialist and Full-Stack Developer. The experience combines oversized editorial typography, a cursor-reactive loading sequence, responsive horizontal world-scroll storytelling, interactive tilt effects, and accessible reduced-motion fallbacks.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Content setup

Copy `.env.example` to `.env.local` and configure the image repository variables to load live project images, profile details, and tech-stack data. The fine-grained GitHub token needs repository Contents read/write access so authenticated admins can upload images and save content from `/admin`. The dashboard writes profile data, global technologies, project descriptions, and project-specific tech stacks to `<IMAGE_PROJECT_PATH>/meta.json`. Without these variables, the public portfolio uses polished local fallback content.

## Quality checks

```bash
npm run lint
npm run build
```

Built with Next.js 16, React 19, Tailwind CSS 4, and anime.js.
