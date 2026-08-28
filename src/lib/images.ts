const GH_API = 'https://api.github.com/repos';

export type ProjectMeta = { title?: string; desc?: string };
export type Meta = {
  projects: Record<string, ProjectMeta>;
  techStack: string[];
};

export type RepoConfig = { owner: string; repo: string; pat: string };

export function imageRepoConfig(): RepoConfig | null {
  const url = process.env.IMAGE_REPO_URL;
  const pat = process.env.IMAGE_REPO_PAT;
  const m = url?.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!url || !pat || !m) return null;
  return { owner: m[1], repo: m[2], pat };
}

export function projectPath() {
  return process.env.IMAGE_PROJECT_PATH?.replace(/^\/+|\/+$/g, '') || 'project';
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
  if (!cfg) return { projects: {}, techStack: [] };
  const res = await githubFetch(cfg, `${projectPath()}/meta.json`, 'json');
  if (!res.ok) return { projects: {}, techStack: [] };
  const data = (await res.json()) as { content: string };
  const parsed = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')) as Partial<Meta>;
  return {
    projects: parsed.projects ?? {},
    techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
  };
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

export function imageUrl(...segments: string[]) {
  return `/api/images/${segments.map(encodeURIComponent).join('/')}`;
}
