'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { name: string; url: string; title: string; desc: string };
type State = 'loading' | 'auth' | 'ready';

export default function AdminPage() {
  const [state, setState] = useState<State>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/data');
    if (res.status === 401) {
      setState('auth');
      return;
    }
    if (!res.ok) {
      setError('Failed to load projects');
      setState('auth');
      return;
    }
    const data = (await res.json()) as { projects: Project[] };
    setProjects(data.projects);
    setState('ready');
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load, guarded by live flag in load()
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
      body: JSON.stringify({ projects }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Failed to save');
      return;
    }
    setError('');
    alert('Saved');
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
            <p className="text-sm text-on-surface-variant mt-1">Enter password to manage projects.</p>
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
          <h1 className="font-display text-2xl font-semibold text-cotton">Projects</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {projects.length} image{projects.length === 1 ? '' : 's'} in repo. Title & description go to{' '}
            <code className="font-mono text-primary-container">meta.json</code>.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-on-surface-variant hover:text-primary-container transition-colors"
        >
          ← View site
        </Link>
      </div>

      {error && <p className="text-sm text-active mb-4">{error}</p>}

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
