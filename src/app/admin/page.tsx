'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { name: string; url: string; title: string; desc: string };
type Icon = { slug: string; label: string; url: string };
type State = 'loading' | 'auth' | 'ready';

export default function AdminPage() {
  const [state, setState] = useState<State>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [icons, setIcons] = useState<Icon[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    const res = await fetch('/api/admin/data');
    if (res.status === 401) {
      setState('auth');
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Failed to load projects');
      setState('auth');
      return;
    }
    const data = (await res.json()) as { projects: Project[]; icons: Icon[]; techStack: string[] };
    setProjects(data.projects);
    setIcons(data.icons);
    setTechStack(data.techStack);
    setState('ready');
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
    load();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError('Wrong password');
      return;
    }
    setPassword('');
    await load();
  }

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects, techStack }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Failed to save');
      return;
    }
    setError('');
    setNotice('Project details saved to GitHub.');
  }

  async function uploadFiles(input: FileList | File[]) {
    const files = Array.from(input).slice(0, 6);
    if (!files.length) return;
    setError('');
    setNotice('');

    const added: Project[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)) {
        setError(`${file.name}: unsupported image format.`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError(`${file.name}: image must be 8 MB or smaller.`);
        continue;
      }
      setUploading(`${i + 1}/${files.length}`);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/images', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { project?: Project; error?: string };
      if (!res.ok || !data.project) {
        setError(data.error ?? `Failed to upload ${file.name}`);
        continue;
      }
      added.push(data.project);
    }

    setUploading('');
    if (added.length) {
      setProjects((prev) => [...added, ...prev]);
      setNotice(`${added.length} image${added.length === 1 ? '' : 's'} uploaded. Add the title and description, then save.`);
    }
  }

  function toggleIcon(slug: string) {
    setTechStack((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  if (state === 'loading') {
    return <Shell><p className="font-mono text-sm text-on-surface-variant">LOADING…</p></Shell>;
  }

  if (state === 'auth') {
    return (
      <Shell>
        <form onSubmit={login} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-cotton">Admin</h1>
            <p className="text-sm text-on-surface-variant mt-1">Enter password to manage content.</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-xl border border-line-strong bg-surface-container px-4 py-3 text-sm text-cotton placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container/60"
          />
          {error && <p className="text-sm text-active">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-primary-container text-on-primary-container px-6 py-3 text-sm font-semibold hover:opacity-90"
          >
            Login
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-cotton">Admin</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage projects & tech stack logos.</p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-on-surface-variant hover:text-primary-container transition-colors"
        >
          ← View site
        </Link>
      </div>

      {error && <p className="rounded-xl border border-primary-container/40 bg-primary-container/10 px-4 py-3 text-sm text-primary-container mb-4">{error}</p>}
      {notice && <p className="rounded-xl border border-active/40 bg-active/10 px-4 py-3 text-sm text-active mb-4">{notice}</p>}

      <section className="mb-10">
        <h2 className="font-display text-lg font-semibold text-cotton mb-1">Tech Stack</h2>
        <p className="text-sm text-on-surface-variant mb-4">
          Pick technologies shown to visitors. {techStack.length} selected.
        </p>
        {icons.length === 0 ? (
          <p className="text-sm text-on-surface-variant/60 font-mono">No icons available.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {icons.map((ic) => {
              const active = techStack.includes(ic.slug);
              return (
                <button
                  key={ic.slug}
                  onClick={() => toggleIcon(ic.slug)}
                  title={ic.label}
                  className={`relative rounded-xl border p-2 aspect-square flex items-center justify-center transition-colors ${
                    active
                      ? 'border-primary-container bg-primary-container/10'
                      : 'border-line-strong bg-surface-container/60 hover:border-outline'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local thumbnail */}
                  <img src={ic.url} alt={ic.label} className="max-h-full max-w-full object-contain" />
                  {active && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary-container text-on-primary-container text-xs flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-cotton mb-1">Projects</h2>
            <p className="text-sm text-on-surface-variant">
              Upload up to 6 images at once. JPG, PNG, WebP, AVIF, or GIF — max 8 MB each.
            </p>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] tracking-[.16em] text-on-surface-variant/50">GITHUB STORAGE</span>
        </div>

        <label
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            void uploadFiles(e.dataTransfer.files);
          }}
          className={`group mb-7 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
            dragActive
              ? 'border-cyan bg-cyan/10'
              : 'border-line-strong bg-surface-container/50 hover:border-primary-container/70 hover:bg-primary-container/5'
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            multiple
            disabled={!!uploading}
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.currentTarget.value = '';
            }}
            className="sr-only"
          />
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl border-2 border-ink bg-cyan text-2xl font-black text-ink shadow-[4px_5px_0_var(--color-ink)] transition-transform group-hover:-translate-y-1">
            {uploading ? '↻' : '↑'}
          </span>
          <span className="font-display font-bold text-cotton">
            {uploading ? `Uploading ${uploading}…` : 'Drop project images here'}
          </span>
          <span className="mt-1 text-xs text-on-surface-variant/70">or click to browse your device</span>
        </label>

        <p className="text-sm text-on-surface-variant mb-4">
          {projects.length} image{projects.length === 1 ? '' : 's'} in repo. Title & description go to{' '}
          <code className="font-mono text-primary-container">meta.json</code>.
        </p>

        <div className="space-y-4">
          {projects.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl border border-line-strong bg-surface-container/60 p-4 grid md:grid-cols-[120px_1fr] gap-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local thumbnail */}
              <img src={p.url} alt="" className="w-full aspect-[16/11] object-cover rounded-lg border border-line-strong" />
              <div className="space-y-3">
                <input
                  value={p.title}
                  onChange={(e) => setProjects((prev) => prev.map((x) => (x.name === p.name ? { ...x, title: e.target.value } : x)))}
                  placeholder={p.name.replace(/\.[^.]+$/, '')}
                  className="w-full rounded-lg border border-line-strong bg-surface-container px-3 py-2 text-sm font-medium text-cotton placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container/60"
                />
                <textarea
                  value={p.desc}
                  onChange={(e) => setProjects((prev) => prev.map((x) => (x.name === p.name ? { ...x, desc: e.target.value } : x)))}
                  placeholder="Description"
                  rows={2}
                  className="w-full rounded-lg border border-line-strong bg-surface-container px-3 py-2 text-sm text-on-surface-variant focus:outline-none focus:border-primary-container/60 resize-none"
                />
                <p className="font-mono text-[10px] text-on-surface-variant/50">{p.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-full bg-primary-container text-on-primary-container px-6 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save all'}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16">{children}</div>
    </div>
  );
}
