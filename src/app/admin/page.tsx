'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PROFILE } from '@/lib/profile';
import type { Profile } from '@/lib/profile';

type Project = { name: string; url: string; title: string; desc: string; techStack: string[] };
type Icon = { slug: string; label: string; url: string; hex: string; category: 'IT Support' | 'Technology' };
type State = 'loading' | 'auth' | 'ready';
type PickerTarget = { kind: 'global' } | { kind: 'project'; name: string };

export default function AdminPage() {
  const [state, setState] = useState<State>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [icons, setIcons] = useState<Icon[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [iconQuery, setIconQuery] = useState('');
  const [iconResults, setIconResults] = useState<Icon[]>([]);
  const [iconLoading, setIconLoading] = useState(false);

  const iconMap = useMemo(() => new Map(icons.map((icon) => [icon.slug, icon])), [icons]);

  async function load() {
    const res = await fetch('/api/admin/data');
    if (res.status === 401) {
      setState('auth');
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Gagal memuat project.');
      setState('auth');
      return;
    }
    const data = (await res.json()) as { projects: Project[]; icons: Icon[]; techStack: string[]; profile: Profile; storageConfigured: boolean };
    setProjects(data.projects);
    setIcons(data.icons);
    setIconResults(data.icons);
    setTechStack(data.techStack);
    setProfile(data.profile);
    setStorageConfigured(data.storageConfigured);
    setDirty(false);
    setState('ready');
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated data request
    void load();
  }, []);

  useEffect(() => {
    if (!pickerTarget) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/icons?q=${encodeURIComponent(iconQuery)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { icons: Icon[] };
        setIconResults(data.icons);
        setIcons((previous) => {
          const merged = new Map(previous.map((icon) => [icon.slug, icon]));
          data.icons.forEach((icon) => merged.set(icon.slug, icon));
          return [...merged.values()];
        });
        setIconLoading(false);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          console.error('Icon search failed:', requestError);
          setIconLoading(false);
        }
      }
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [iconQuery, pickerTarget]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError('Password salah.');
      return;
    }
    setPassword('');
    await load();
  }

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    const res = await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects, techStack, profile }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Gagal menyimpan perubahan.');
      return;
    }
    setDirty(false);
    setNotice('Semua perubahan berhasil disimpan ke GitHub.');
  }

  async function uploadFiles(input: FileList | File[]) {
    const files = Array.from(input).slice(0, 6);
    if (!files.length) return;
    setError('');
    setNotice('');

    const added: Project[] = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)) {
        setError(`${file.name}: format gambar belum didukung.`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError(`${file.name}: ukuran maksimal 8 MB.`);
        continue;
      }
      setUploading(`${index + 1}/${files.length}`);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/images', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { project?: Project; error?: string };
      if (!res.ok || !data.project) {
        setError(data.error ?? `Gagal mengunggah ${file.name}.`);
        continue;
      }
      added.push(data.project);
    }

    setUploading('');
    if (added.length) {
      setProjects((previous) => [...added, ...previous]);
      setDirty(true);
      setNotice(`${added.length} gambar berhasil diunggah. Lengkapi detail dan tech stack, lalu simpan.`);
    }
  }

  function updateProject(name: string, update: Partial<Project>) {
    setProjects((previous) => previous.map((project) => project.name === name ? { ...project, ...update } : project));
    setDirty(true);
  }

  function updateProfile(update: Partial<Profile>) {
    setProfile((previous) => ({ ...previous, ...update }));
    setDirty(true);
  }

  function openPicker(target: PickerTarget) {
    setPickerTarget(target);
    setIconQuery('');
    setIconResults(icons.slice(0, 80));
    setIconLoading(false);
  }

  function selectedForTarget(target: PickerTarget) {
    if (target.kind === 'global') return techStack;
    return projects.find((project) => project.name === target.name)?.techStack ?? [];
  }

  function togglePickerIcon(slug: string) {
    if (!pickerTarget) return;
    if (pickerTarget.kind === 'global') {
      setTechStack((previous) => previous.includes(slug) ? previous.filter((item) => item !== slug) : [...previous, slug]);
    } else {
      const project = projects.find((item) => item.name === pickerTarget.name);
      if (!project) return;
      updateProject(project.name, {
        techStack: project.techStack.includes(slug)
          ? project.techStack.filter((item) => item !== slug)
          : [...project.techStack, slug],
      });
    }
    setDirty(true);
  }

  function removeGlobalIcon(slug: string) {
    setTechStack((previous) => previous.filter((item) => item !== slug));
    setDirty(true);
  }

  if (state === 'loading') return <LoadingScreen />;
  if (state === 'auth') return <LoginScreen password={password} error={error} onPassword={setPassword} onSubmit={login} />;

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_10%,rgba(66,220,255,.12),transparent_28%),radial-gradient(circle_at_88%_4%,rgba(255,92,187,.13),transparent_24%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-5 rounded-[1.75rem] border border-line-strong bg-surface-container/80 p-5 shadow-[0_22px_70px_rgba(0,0,0,.18)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-pink font-display text-xl font-black text-ink shadow-[4px_5px_0_var(--color-ink)]">H.</span>
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[.22em] text-cyan">PORTFOLIO CONTROL ROOM</p>
              <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-cotton sm:text-3xl">Content dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-2 font-mono text-[10px] text-on-surface-variant">
              <span className={`h-2 w-2 rounded-full ${storageConfigured ? 'bg-active shadow-[0_0_12px_var(--color-active)]' : 'bg-yellow'}`} />
              {storageConfigured ? 'GITHUB CONNECTED' : 'STORAGE SETUP REQUIRED'}
            </span>
            <Link href="/" className="rounded-full border border-line-strong bg-cotton px-4 py-2 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">
              Lihat website ↗
            </Link>
          </div>
        </header>

        <div aria-live="polite">
          {error ? <Notice tone="error">{error}</Notice> : null}
          {notice ? <Notice tone="success">{notice}</Notice> : null}
          {!storageConfigured ? <Notice tone="warning">Isi IMAGE_REPO_URL dan IMAGE_REPO_PAT di environment agar upload dan penyimpanan aktif.</Notice> : null}
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="bg-pink" value={projects.length} label="Project tersimpan" icon="▣" />
          <StatCard accent="bg-cyan" value={techStack.length} label="Core tech stack" icon="⌘" />
          <StatCard accent="bg-lime" value={projects.reduce((total, project) => total + project.techStack.length, 0)} label="Tag di project" icon="✦" />
          <StatCard accent="bg-yellow" value={`${profileCompletion(profile)}%`} label="Kelengkapan profil" icon="◎" />
        </section>

        <section className="mb-8 rounded-[1.75rem] border border-line-strong bg-surface-container/70 p-5 sm:p-7">
          <SectionTitle index="01" title="Data diri" description="Konten utama portfolio. Semua field disimpan ke meta.json di repository GitHub." />
          <ProfileEditor profile={profile} onChange={updateProfile} />
        </section>

        <section className="mb-8 rounded-[1.75rem] border border-line-strong bg-surface-container/70 p-5 sm:p-7">
          <SectionTitle index="02" title="Core tech stack" description="Ikon utama yang tampil di bagian capabilities portfolio." />
          <SelectedIcons
            slugs={techStack}
            iconMap={iconMap}
            empty="Belum ada core tech stack."
            onRemove={removeGlobalIcon}
          />
          <button onClick={() => openPicker({ kind: 'global' })} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan px-5 py-2.5 text-sm font-black text-ink shadow-[4px_5px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5">
            <span className="text-lg">＋</span> Pilih ikon
          </button>
        </section>

        <section className="mb-8 rounded-[1.75rem] border border-line-strong bg-surface-container/70 p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <SectionTitle index="03" title="Tambah project" description="Unggah hingga 6 gambar sekaligus, maksimal 8 MB per gambar." />
            <label
              onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
              onDrop={(event) => { event.preventDefault(); setDragActive(false); void uploadFiles(event.dataTransfer.files); }}
              className={`group flex min-h-32 items-center gap-4 rounded-2xl border-2 border-dashed px-6 transition-all lg:min-w-[29rem] ${storageConfigured ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'} ${dragActive ? 'border-cyan bg-cyan/10' : 'border-line-strong bg-surface hover:border-pink'}`}
            >
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple disabled={Boolean(uploading) || !storageConfigured} onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); event.currentTarget.value = ''; }} className="sr-only" />
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-yellow text-2xl font-black text-ink shadow-[4px_5px_0_var(--color-ink)]">{uploading ? '↻' : '↑'}</span>
              <span>
                <span className="block font-display font-bold text-cotton">{!storageConfigured ? 'Hubungkan GitHub storage dahulu' : uploading ? `Mengunggah ${uploading}…` : 'Drop gambar atau klik di sini'}</span>
                <span className="mt-1 block text-xs text-on-surface-variant">JPG, PNG, WebP, AVIF, GIF</span>
              </span>
            </label>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <SectionTitle index="04" title="Kelola project" description="Atur judul, deskripsi, dan tech stack yang tampil di setiap card." />
            <span className="hidden rounded-full border border-line-strong px-3 py-1.5 font-mono text-[10px] text-on-surface-variant sm:inline">{projects.length} ITEMS</span>
          </div>
          {projects.length ? (
            <div className="space-y-5">
              {projects.map((project, index) => (
                <ProjectEditor
                  key={project.name}
                  index={index}
                  project={project}
                  iconMap={iconMap}
                  onChange={(update) => updateProject(project.name, update)}
                  onPickIcons={() => openPicker({ kind: 'project', name: project.name })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border-2 border-dashed border-line-strong px-8 py-16 text-center text-on-surface-variant">Belum ada project. Unggah gambar pertama dari panel di atas.</div>
          )}
        </section>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-surface/90 p-3 backdrop-blur-xl transition-transform ${dirty ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-1 sm:px-5">
          <p className="hidden text-sm text-on-surface-variant sm:block"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-yellow" />Ada perubahan yang belum disimpan.</p>
          <button onClick={save} disabled={saving} className="ml-auto w-full rounded-full bg-pink px-7 py-3 text-sm font-black text-ink shadow-[4px_5px_0_var(--color-ink)] disabled:opacity-60 sm:w-auto">
            {saving ? 'Menyimpan…' : 'Simpan semua perubahan'}
          </button>
        </div>
      </div>

      {pickerTarget ? (
        <IconPicker
          title={pickerTarget.kind === 'global' ? 'Pilih core tech stack' : `Tech stack · ${projects.find((project) => project.name === pickerTarget.name)?.title || 'Project'}`}
          query={iconQuery}
          icons={iconResults}
          selected={selectedForTarget(pickerTarget)}
          loading={iconLoading}
          onQuery={(value) => { setIconQuery(value); setIconLoading(true); }}
          onToggle={togglePickerIcon}
          onClose={() => setPickerTarget(null)}
        />
      ) : null}
    </main>
  );
}

function ProfileEditor({ profile, onChange }: { profile: Profile; onChange: (update: Partial<Profile>) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <fieldset className="rounded-2xl border border-line-strong bg-surface/55 p-4 sm:p-5">
        <legend className="px-2 font-mono text-[10px] font-black tracking-[.18em] text-cyan">IDENTITAS &amp; POSISI</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileField label="Nama lengkap" value={profile.name} onChange={(name) => onChange({ name })} />
          <ProfileField label="Nama pendek" value={profile.shortName} onChange={(shortName) => onChange({ shortName })} />
          <ProfileField label="Posisi utama" value={profile.primaryRole} onChange={(primaryRole) => onChange({ primaryRole })} />
          <ProfileField label="Status" value={profile.status} onChange={(status) => onChange({ status })} placeholder="Open to work" />
          <ProfileField label="Lokasi lengkap" value={profile.location} onChange={(location) => onChange({ location })} />
          <ProfileField label="Lokasi pendek" value={profile.locationShort} onChange={(locationShort) => onChange({ locationShort })} placeholder="Kendari, ID" />
          <div className="sm:col-span-2">
            <ProfileField label="Fokus pekerjaan" value={profile.focus} onChange={(focus) => onChange({ focus })} placeholder="Infrastructure · Cloud · Web" />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line-strong bg-surface/55 p-4 sm:p-5">
        <legend className="px-2 font-mono text-[10px] font-black tracking-[.18em] text-pink">HERO &amp; PROFIL</legend>
        <div className="space-y-4">
          <ProfileField label="Role berputar — pisahkan dengan koma" value={profile.roles.join(', ')} onChange={(roles) => onChange({ roles: roles.split(',').map((role) => role.trim()).filter(Boolean).slice(0, 8) })} />
          <ProfileArea label="Intro hero" value={profile.heroIntro} onChange={(heroIntro) => onChange({ heroIntro })} rows={3} />
          <ProfileArea label="Tentang saya — paragraf pertama" value={profile.about} onChange={(about) => onChange({ about })} rows={3} />
          <ProfileArea label="Tentang saya — paragraf kedua" value={profile.aboutSecondary} onChange={(aboutSecondary) => onChange({ aboutSecondary })} rows={3} />
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line-strong bg-surface/55 p-4 sm:p-5 xl:col-span-2">
        <legend className="px-2 font-mono text-[10px] font-black tracking-[.18em] text-lime">KONTAK &amp; LINK</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Email" value={profile.email} onChange={(email) => onChange({ email })} type="email" />
          <ProfileField label="Nomor telepon / WhatsApp" value={profile.phone} onChange={(phone) => onChange({ phone })} placeholder="+62…" />
          <ProfileField label="Website" value={profile.website} onChange={(website) => onChange({ website })} type="url" />
          <ProfileField label="GitHub" value={profile.github} onChange={(github) => onChange({ github })} type="url" />
          <ProfileField label="LinkedIn" value={profile.linkedin} onChange={(linkedin) => onChange({ linkedin })} type="url" />
          <div className="sm:col-span-2 lg:col-span-1">
            <ProfileArea label="Pesan availability" value={profile.availability} onChange={(availability) => onChange({ availability })} rows={3} />
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: 'text' | 'email' | 'url' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-on-surface-variant">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-line-strong bg-surface-container px-4 py-3 text-sm text-cotton placeholder:text-on-surface-variant/35 focus:border-cyan focus:outline-none" />
    </label>
  );
}

function ProfileArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-on-surface-variant">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="w-full resize-none rounded-xl border border-line-strong bg-surface-container px-4 py-3 text-sm leading-relaxed text-cotton focus:border-cyan focus:outline-none" />
    </label>
  );
}

function profileCompletion(profile: Profile) {
  const values = Object.values(profile).flatMap((value) => Array.isArray(value) ? value : [value]);
  return Math.round((values.filter((value) => Boolean(value.trim())).length / values.length) * 100);
}

function ProjectEditor({ index, project, iconMap, onChange, onPickIcons }: { index: number; project: Project; iconMap: Map<string, Icon>; onChange: (update: Partial<Project>) => void; onPickIcons: () => void }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-line-strong bg-surface-container/75 shadow-[0_18px_55px_rgba(0,0,0,.14)]">
      <div className="grid lg:grid-cols-[19rem_1fr]">
        <div className="relative min-h-56 overflow-hidden border-b border-line-strong bg-surface lg:min-h-full lg:border-b-0 lg:border-r">
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated runtime image proxy */}
          <img src={project.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-4 top-4 rounded-lg border-2 border-ink bg-yellow px-3 py-2 font-mono text-xs font-black text-ink shadow-[3px_4px_0_var(--color-ink)]">{String(index + 1).padStart(2, '0')}</span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-5 pb-4 pt-14">
            <p className="truncate font-mono text-[10px] text-white/70">{project.name}</p>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          <label className="block">
            <span className="mb-2 block font-mono text-[10px] font-bold tracking-[.16em] text-on-surface-variant">JUDUL PROJECT</span>
            <input value={project.title} onChange={(event) => onChange({ title: event.target.value })} placeholder={project.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')} className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 font-display text-lg font-bold text-cotton placeholder:text-on-surface-variant/40 focus:border-cyan focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block font-mono text-[10px] font-bold tracking-[.16em] text-on-surface-variant">DESKRIPSI</span>
            <textarea value={project.desc} onChange={(event) => onChange({ desc: event.target.value })} placeholder="Ceritakan masalah, solusi, dan hasil project…" rows={3} className="w-full resize-none rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm leading-relaxed text-on-surface-variant focus:border-cyan focus:outline-none" />
          </label>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[.16em] text-on-surface-variant">TECH STACK &amp; IT SUPPORT</p>
                <p className="mt-1 text-xs text-on-surface-variant/65">Ikon ini akan muncul langsung di card project.</p>
              </div>
              <button onClick={onPickIcons} className="shrink-0 rounded-full border border-line-strong bg-surface px-4 py-2 text-xs font-bold text-cotton hover:border-pink">＋ Tambah</button>
            </div>
            <SelectedIcons
              slugs={project.techStack}
              iconMap={iconMap}
              empty="Belum memilih tech stack."
              onRemove={(slug) => onChange({ techStack: project.techStack.filter((item) => item !== slug) })}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function SelectedIcons({ slugs, iconMap, empty, onRemove }: { slugs: string[]; iconMap: Map<string, Icon>; empty: string; onRemove: (slug: string) => void }) {
  if (!slugs.length) return <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-on-surface-variant/60">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {slugs.map((slug) => {
        const icon = iconMap.get(slug);
        return (
          <span key={slug} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-2 text-xs font-bold text-cotton">
            {icon ? <img src={icon.url} alt="" className="h-4 w-4 object-contain" /> : null /* eslint-disable-line @next/next/no-img-element */}
            {icon?.label ?? slug}
            <button type="button" onClick={() => onRemove(slug)} aria-label={`Hapus ${icon?.label ?? slug}`} className="ml-0.5 text-base leading-none text-on-surface-variant hover:text-pink">×</button>
          </span>
        );
      })}
    </div>
  );
}

function IconPicker({ title, query, icons, selected, loading, onQuery, onToggle, onClose }: { title: string; query: string; icons: Icon[]; selected: string[]; loading: boolean; onQuery: (value: string) => void; onToggle: (slug: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.75rem] border border-line-strong bg-surface shadow-2xl sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-5 border-b border-line-strong p-5 sm:p-7">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[.2em] text-cyan">3.400+ OFFICIAL BRAND ICONS</p>
            <h2 className="mt-1 font-display text-xl font-black text-cotton sm:text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Cari teknologi, vendor, perangkat, jaringan, monitoring, atau support tools.</p>
          </div>
          <button onClick={onClose} aria-label="Tutup pemilih ikon" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-container text-xl text-cotton hover:border-pink">×</button>
        </div>
        <div className="border-b border-line-strong p-4 sm:px-7">
          <label className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">⌕</span>
            <input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Cari: React, Cisco, Wireshark, Windows, Docker…" className="w-full rounded-xl border border-line-strong bg-surface-container py-3 pl-11 pr-4 text-sm text-cotton placeholder:text-on-surface-variant/45 focus:border-cyan focus:outline-none" />
          </label>
          <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
            <span>{query ? `Hasil untuk “${query}”` : 'Rekomendasi teknologi & IT support'}</span>
            <span>{selected.length} dipilih</span>
          </div>
        </div>
        <div className="min-h-64 flex-1 overflow-y-auto p-4 sm:p-7">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">{Array.from({ length: 18 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-surface-container" />)}</div>
          ) : icons.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {icons.map((icon) => {
                const active = selected.includes(icon.slug);
                return (
                  <button key={icon.slug} onClick={() => onToggle(icon.slug)} title={icon.label} className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition-transform hover:-translate-y-0.5 ${active ? 'border-cyan bg-cyan/10 ring-1 ring-cyan' : 'border-line-strong bg-surface-container hover:border-outline'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- official runtime icon CDN */}
                    <img src={icon.url} alt="" className="h-8 w-8 object-contain sm:h-9 sm:w-9" loading="lazy" />
                    <span className="line-clamp-1 w-full text-[10px] font-bold text-cotton">{icon.label}</span>
                    {icon.category === 'IT Support' ? <span className="absolute left-1.5 top-1.5 rounded bg-lime px-1 py-0.5 font-mono text-[7px] font-black text-ink">IT</span> : null}
                    {active ? <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-cyan text-xs font-black text-ink">✓</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center text-center text-sm text-on-surface-variant">Ikon tidak ditemukan. Coba nama produk atau vendor lain.</div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line-strong bg-surface-container/70 p-4 sm:px-7">
          <p className="text-xs text-on-surface-variant">Pilihan tersimpan setelah menekan tombol simpan utama.</p>
          <button onClick={onClose} className="rounded-full bg-cotton px-6 py-2.5 text-sm font-black text-ink">Selesai</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-8 min-w-8 place-items-center rounded-lg border-2 border-ink bg-pink font-mono text-[10px] font-black text-ink shadow-[2px_3px_0_var(--color-ink)]">{index}</span>
      <div>
        <h2 className="font-display text-xl font-black text-cotton">{title}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}

function StatCard({ accent, value, label, icon }: { accent: string; value: number | string; label: string; icon: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line-strong bg-surface-container/70 p-4">
      <span className={`grid h-11 w-11 place-items-center rounded-xl border-2 border-ink text-lg font-black text-ink ${accent}`}>{icon}</span>
      <div><p className="font-display text-2xl font-black text-cotton">{value}</p><p className="text-xs text-on-surface-variant">{label}</p></div>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'error' | 'success' | 'warning'; children: React.ReactNode }) {
  const style = tone === 'error'
    ? 'border-pink/50 bg-pink/10 text-pink'
    : tone === 'warning'
      ? 'border-yellow/45 bg-yellow/10 text-yellow'
      : 'border-active/40 bg-active/10 text-active';
  return <p className={`mb-5 rounded-xl border px-4 py-3 text-sm ${style}`}>{children}</p>;
}

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-surface"><div className="text-center"><span className="mx-auto mb-4 grid h-14 w-14 animate-pulse place-items-center rounded-2xl border-2 border-ink bg-pink font-display text-xl font-black text-ink shadow-[4px_5px_0_var(--color-ink)]">H.</span><p className="font-mono text-xs tracking-[.2em] text-on-surface-variant">LOADING CONTROL ROOM</p></div></div>;
}

function LoginScreen({ password, error, onPassword, onSubmit }: { password: string; error: string; onPassword: (value: string) => void; onSubmit: (event: React.FormEvent) => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5 text-on-surface">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-[1.75rem] border border-line-strong bg-surface-container p-7 shadow-[0_25px_80px_rgba(0,0,0,.25)] sm:p-9">
        <span className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-pink font-display text-xl font-black text-ink shadow-[4px_5px_0_var(--color-ink)]">H.</span>
        <p className="font-mono text-[10px] font-bold tracking-[.22em] text-cyan">PRIVATE ACCESS</p>
        <h1 className="mt-2 font-display text-3xl font-black text-cotton">Admin panel</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Masuk untuk mengelola project dan tech stack portfolio.</p>
        <input type="password" value={password} onChange={(event) => onPassword(event.target.value)} placeholder="Password admin" autoFocus className="mt-7 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm text-cotton placeholder:text-on-surface-variant/45 focus:border-cyan focus:outline-none" />
        {error ? <p className="mt-3 text-sm text-pink">{error}</p> : null}
        <button type="submit" className="mt-5 w-full rounded-full bg-pink px-6 py-3 text-sm font-black text-ink shadow-[4px_5px_0_var(--color-ink)]">Masuk ke dashboard</button>
      </form>
    </main>
  );
}
