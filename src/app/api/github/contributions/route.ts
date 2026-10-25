const USERNAME_RE = /^[A-Za-z0-9-]{1,39}$/;
const CELL_RE = /data-date="([^"]+)"[^>]*data-level="([0-4])"/g;
const TOTAL_RE = /([\d,]+)\s+contributions?\s+in the last year/i;

type ContributionCell = { date: string; level: number; week: number; day: number };

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get('username')?.trim() ?? '';
  if (!USERNAME_RE.test(username)) {
    return Response.json({ error: 'GitHub username tidak valid.' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
      headers: { Accept: 'text/html', 'User-Agent': 'portfolio-contribution-calendar' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return Response.json({ error: `GitHub merespons ${response.status}.` }, { status: 502 });
    }

    const html = await response.text();
    const cells: ContributionCell[] = [];
    let match: RegExpExecArray | null;
    while ((match = CELL_RE.exec(html))) {
      const date = new Date(`${match[1]}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) continue;
      cells.push({ date: match[1], level: Number(match[2]), week: 0, day: date.getUTCDay() });
    }
    if (!cells.length) return Response.json({ error: 'Kalender kontribusi kosong.' }, { status: 502 });

    const start = new Date(`${cells[0].date}T00:00:00Z`).getTime();
    for (const cell of cells) {
      cell.week = Math.floor((new Date(`${cell.date}T00:00:00Z`).getTime() - start) / 86_400_000 / 7);
    }
    const totalMatch = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(TOTAL_RE);
    const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : null;
    return Response.json(
      { username, total, updatedAt: new Date().toISOString(), cells },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    return Response.json({ error: 'GitHub tidak dapat dihubungi sekarang.' }, { status: 502 });
  }
}
