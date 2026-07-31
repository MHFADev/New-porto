const GH_API = 'https://api.github.com/repos';

export function imageRepoConfig() {
  const url = process.env.IMAGE_REPO_URL;
  const pat = process.env.IMAGE_REPO_PAT;
  const m = url?.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!url || !pat || !m) return null;
  return { owner: m[1], repo: m[2], pat };
}

export async function githubFetch(cfg: { owner: string; repo: string; pat: string }, path: string, accept: 'raw' | 'json') {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return fetch(`${GH_API}/${cfg.owner}/${cfg.repo}/contents/${encoded}`, {
    headers: {
      Authorization: `Bearer ${cfg.pat}`,
      Accept: accept === 'raw' ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
}
