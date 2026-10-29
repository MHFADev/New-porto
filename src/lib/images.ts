import { DEFAULT_PROFILE, normalizeProfile } from '@/lib/profile';
import type { Profile } from '@/lib/profile';

const GH_API = 'https://api.github.com/repos';

export type ProjectMeta = { title?: string; desc?: string; titleEn?: string; descEn?: string; techStack?: string[] };
export type CertificateMeta = { title?: string; issuer?: string; year?: string; desc?: string; titleEn?: string; descEn?: string; verifyUrl?: string };
export type Meta = {
  projects: Record<string, ProjectMeta>;
  certificates: Record<string, CertificateMeta>;
  techStack: string[];
  profile: Profile;
};

export type RepoConfig = { owner: string; repo: string; pat: string };

export function imageRepoConfig(): RepoConfig | null {
  const url = process.env.IMAGE_REPO_URL?.trim().replace(/^['"]|['"]$/g, '');
  const pat = process.env.IMAGE_REPO_PAT?.trim().replace(/^['"]|['"]$/g, '');
  const m = url?.match(/github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (!url || !pat || !m) return null;
  return { owner: m[1], repo: m[2], pat };
}

export function projectPath() {
  const configured = process.env.IMAGE_PROJECT_PATH?.trim().replace(/^['"]|['"]$/g, '');
  if (configured) return configured.replace(/^\/+|\/+$/g, '');
  const url = process.env.IMAGE_REPO_URL?.trim();
  const folderFromUrl = url?.match(/\/tree\/[^/]+\/(.+?)(?:[?#].*)?\/?$/i)?.[1];
  return folderFromUrl ? decodeURIComponent(folderFromUrl).replace(/^\/+|\/+$/g, '') : 'project';
}

function headers(cfg: RepoConfig, accept: string) {
  return {
    Authorization: `Bearer ${cfg.pat}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function contentUrl(cfg: RepoConfig, path: string) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${GH_API}/${cfg.owner}/${cfg.repo}/contents/${encoded}`;
}

export async function githubFetch(cfg: RepoConfig, path: string, accept: 'raw' | 'json') {
  return fetch(contentUrl(cfg, path), {
    headers: headers(cfg, accept === 'raw' ? 'application/vnd.github.raw' : 'application/vnd.github+json'),
    cache: 'no-store',
  });
}

export async function readMeta(): Promise<Meta> {
  const cfg = imageRepoConfig();
  if (!cfg) return { projects: {}, certificates: {}, techStack: [], profile: DEFAULT_PROFILE };
  const res = await githubFetch(cfg, `${projectPath()}/meta.json`, 'json');
  if (!res.ok) return { projects: {}, certificates: {}, techStack: [], profile: DEFAULT_PROFILE };
  try {
    const data = (await res.json()) as { content?: string };
    if (!data.content) return { projects: {}, certificates: {}, techStack: [], profile: DEFAULT_PROFILE };
    const parsed = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')) as Partial<Meta>;
    return {
      projects: parsed.projects ?? {},
      certificates: parsed.certificates ?? {},
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      profile: normalizeProfile(parsed.profile),
    };
  } catch {
    return { projects: {}, certificates: {}, techStack: [], profile: DEFAULT_PROFILE };
  }
}

export async function writeMeta(meta: Meta) {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false, error: 'not configured' };
  const path = `${projectPath()}/meta.json`;
  const url = contentUrl(cfg, path);
  const existing = await fetch(url, {
    headers: headers(cfg, 'application/vnd.github+json'),
    cache: 'no-store',
  });
  const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;
  const body: Record<string, string> = {
    message: 'Update project metadata',
    content: Buffer.from(JSON.stringify(meta, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: err?.message || `GitHub ${res.status}` };
  }
  return { ok: true };
}

export function safeImageName(name: string) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'project';
  return `${base}-${Date.now()}${ext}`;
}

export async function uploadProjectImage(name: string, bytes: Uint8Array) {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false as const, error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' };
  const fileName = safeImageName(name);
  const path = `${projectPath()}/${fileName}`;
  const res = await fetch(contentUrl(cfg, path), {
    method: 'PUT',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify({
      message: `Add portfolio project image: ${fileName}`,
      content: Buffer.from(bytes).toString('base64'),
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: err?.message || `GitHub ${res.status}` };
  }
  return { ok: true as const, fileName, path };
}

export async function deleteProjectImage(fileName: string) {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false as const, error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' };
  if (!/^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif)$/i.test(fileName) || fileName.includes('..')) {
    return { ok: false as const, error: 'Nama file gambar tidak valid.' };
  }
  const url = contentUrl(cfg, `${projectPath()}/${fileName}`);
  const existing = await fetch(url, {
    headers: headers(cfg, 'application/vnd.github+json'),
    cache: 'no-store',
  });
  if (existing.status === 404) return { ok: false as const, error: 'Gambar tidak ditemukan.' };
  if (!existing.ok) return { ok: false as const, error: `GitHub ${existing.status}: gagal membaca gambar.` };
  const { sha } = (await existing.json()) as { sha?: string };
  if (!sha) return { ok: false as const, error: 'GitHub tidak mengembalikan identitas gambar.' };
  const removed = await fetch(url, {
    method: 'DELETE',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify({ message: `Delete portfolio project image: ${fileName}`, sha }),
    cache: 'no-store',
  });
  if (!removed.ok) {
    const err = (await removed.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: err?.message || `GitHub ${removed.status}` };
  }
  return { ok: true as const };
}

export async function uploadPortfolioCv(bytes: Uint8Array) {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false as const, error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' };
  const path = `${projectPath()}/cv.pdf`;
  const url = contentUrl(cfg, path);
  const existing = await fetch(url, {
    headers: headers(cfg, 'application/vnd.github+json'),
    cache: 'no-store',
  });
  if (!existing.ok && existing.status !== 404) {
    return { ok: false as const, error: `GitHub ${existing.status}: gagal membaca CV lama.` };
  }
  const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined;
  const body: Record<string, string> = {
    message: 'Upload portfolio CV',
    content: Buffer.from(bytes).toString('base64'),
  };
  if (sha) body.sha = sha;
  const uploaded = await fetch(url, {
    method: 'PUT',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!uploaded.ok) {
    const err = (await uploaded.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: err?.message || `GitHub ${uploaded.status}` };
  }
  return { ok: true as const, fileName: 'cv.pdf' };
}

export async function deletePortfolioCv() {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false as const, error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' };
  const url = contentUrl(cfg, `${projectPath()}/cv.pdf`);
  const existing = await fetch(url, {
    headers: headers(cfg, 'application/vnd.github+json'),
    cache: 'no-store',
  });
  if (existing.status === 404) return { ok: true as const };
  if (!existing.ok) return { ok: false as const, error: `GitHub ${existing.status}: gagal membaca CV.` };
  const { sha } = (await existing.json()) as { sha?: string };
  if (!sha) return { ok: false as const, error: 'GitHub tidak mengembalikan identitas CV.' };
  const removed = await fetch(url, {
    method: 'DELETE',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify({ message: 'Delete portfolio CV', sha }),
    cache: 'no-store',
  });
  if (!removed.ok) {
    const err = (await removed.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: err?.message || `GitHub ${removed.status}` };
  }
  return { ok: true as const };
}


export async function uploadCertificate(name: string, bytes: Uint8Array) {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false as const, error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' };
  const fileName = safeImageName(name);
  const path = `${projectPath()}/certificates/${fileName}`;
  const res = await fetch(contentUrl(cfg, path), {
    method: 'PUT',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify({ message: `Add portfolio certificate: ${fileName}`, content: Buffer.from(bytes).toString('base64') }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: err?.message || `GitHub ${res.status}` };
  }
  return { ok: true as const, fileName, path };
}

export function isValidCertificateName(fileName: string) {
  return /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif|pdf)$/i.test(fileName) && !fileName.includes('..');
}

export async function deleteCertificate(fileName: string) {
  const cfg = imageRepoConfig();
  if (!cfg) return { ok: false as const, error: 'IMAGE_REPO_URL / IMAGE_REPO_PAT not set' };
  if (!isValidCertificateName(fileName)) {
    return { ok: false as const, error: 'Nama file sertifikat tidak valid.' };
  }
  const url = contentUrl(cfg, `${projectPath()}/certificates/${fileName}`);
  const existing = await fetch(url, { headers: headers(cfg, 'application/vnd.github+json'), cache: 'no-store' });
  if (existing.status === 404) return { ok: true as const };
  if (!existing.ok) return { ok: false as const, error: `GitHub ${existing.status}: gagal membaca sertifikat.` };
  const { sha } = (await existing.json()) as { sha?: string };
  if (!sha) return { ok: false as const, error: 'GitHub tidak mengembalikan identitas sertifikat.' };
  const removed = await fetch(url, {
    method: 'DELETE',
    headers: headers(cfg, 'application/vnd.github+json'),
    body: JSON.stringify({ message: `Delete portfolio certificate: ${fileName}`, sha }),
    cache: 'no-store',
  });
  if (!removed.ok) {
    const err = (await removed.json().catch(() => null)) as { message?: string } | null;
    return { ok: false as const, error: err?.message || `GitHub ${removed.status}` };
  }
  return { ok: true as const };
}

export function imageUrl(...segments: string[]) {
  return `/api/images/${segments.map(encodeURIComponent).join('/')}`;
}
