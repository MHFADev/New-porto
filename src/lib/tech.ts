import iconData from 'simple-icons/icons.json';

export type TechIcon = {
  slug: string;
  label: string;
  hex: string;
  category: 'IT Support' | 'Technology';
  url?: string;
};

const CUSTOM_IT_ICONS: TechIcon[] = [
  { slug: 'it-pc', label: 'PC / Computer', hex: '42DCFF', category: 'IT Support', url: '/icons/it-pc.svg' },
  { slug: 'it-monitor', label: 'Monitor / Display', hex: 'FFD84D', category: 'IT Support', url: '/icons/it-monitor.svg' },
  { slug: 'it-maintenance', label: 'System Maintenance', hex: 'FF5CBB', category: 'IT Support', url: '/icons/it-maintenance.svg' },
];

const IT_SUPPORT_SLUGS = new Set([
  'android', 'anydesk', 'apple', 'arduino', 'cisco', 'cloudflare', 'datadog', 'debian',
  'dell', 'docker', 'elastic', 'grafana', 'gnubash', 'hp', 'intel', 'kubernetes', 'lenovo',
  'linux', 'mikrotik', 'nvidia', 'openvpn', 'openwrt', 'pfsense', 'powershell', 'prometheus',
  'proxmox', 'raspberrypi', 'rustdesk', 'splashtop', 'tailscale', 'teamviewer', 'ubiquiti', 'opnsense',
  'ubuntu', 'virtualbox', 'vmware', 'wireguard', 'wireshark', 'windows', 'windows11', 'zabbix',
]);

const IT_SUPPORT_SEARCH: Record<string, string[]> = {
  network: ['cisco', 'ubiquiti', 'mikrotik', 'wireshark', 'pfsense', 'opnsense', 'openwrt', 'cloudflare', 'tailscale', 'wireguard', 'openvpn'],
  jaringan: ['cisco', 'ubiquiti', 'mikrotik', 'wireshark', 'pfsense', 'opnsense', 'openwrt'],
  remote: ['anydesk', 'teamviewer', 'rustdesk', 'splashtop'],
  support: ['it-pc', 'it-monitor', 'it-maintenance', 'anydesk', 'teamviewer', 'rustdesk', 'windows11', 'linux', 'zabbix', 'wireshark'],
  helpdesk: ['zendesk', 'freshworks', 'jira', 'anydesk', 'teamviewer'],
  server: ['linux', 'ubuntu', 'debian', 'proxmox', 'vmware', 'virtualbox', 'docker', 'nginx', 'apache'],
  monitoring: ['zabbix', 'grafana', 'prometheus', 'datadog', 'elastic'],
  hardware: ['it-pc', 'it-monitor', 'it-maintenance', 'dell', 'hp', 'lenovo', 'intel', 'amd', 'nvidia', 'raspberrypi', 'arduino'],
  pc: ['it-pc', 'it-monitor', 'it-maintenance', 'windows11', 'linux'],
  komputer: ['it-pc', 'it-monitor', 'it-maintenance', 'windows11', 'linux'],
  monitor: ['it-monitor', 'it-pc'],
  display: ['it-monitor'],
  maintenance: ['it-maintenance', 'it-pc', 'zabbix'],
  perawatan: ['it-maintenance', 'it-pc', 'zabbix'],
  security: ['cloudflare', 'pfsense', 'opnsense', 'openvpn', 'wireguard', 'tailscale'],
  cloud: ['amazonwebservices', 'googlecloud', 'microsoftazure', 'cloudflare', 'digitalocean'],
};

const POPULAR_SLUGS = [
  'it-pc', 'it-monitor', 'it-maintenance',
  'nextdotjs', 'react', 'typescript', 'javascript', 'nodedotjs', 'python', 'go', 'rust', 'php',
  'cplusplus', 'dotnet', 'java', 'kotlin', 'swift', 'dart', 'flutter', 'tailwindcss', 'html5',
  'css', 'svelte', 'angular', 'vuedotjs', 'nuxt', 'astro', 'redux', 'docker', 'kubernetes',
  'linux', 'windows11', 'git', 'github', 'gitlab', 'postgresql', 'mysql', 'mongodb', 'redis',
  'supabase', 'firebase', 'prisma', 'graphql', 'express', 'vercel', 'vite', 'figma', 'amazonwebservices',
  'googlecloud', 'cloudflare', 'cisco', 'ubiquiti', 'mikrotik', 'wireshark', 'proxmox', 'zabbix',
];

const ALL_TECH_ICONS: TechIcon[] = [
  ...CUSTOM_IT_ICONS,
  ...iconData.map((icon) => ({
    slug: icon.slug,
    label: icon.title,
    hex: icon.hex,
    category: IT_SUPPORT_SLUGS.has(icon.slug) ? 'IT Support' as const : 'Technology' as const,
  })),
];

const ICON_BY_SLUG = new Map(ALL_TECH_ICONS.map((icon) => [icon.slug, icon]));

export const TECH_ICONS = [...new Set([...IT_SUPPORT_SLUGS, ...POPULAR_SLUGS])]
  .map((slug) => ICON_BY_SLUG.get(slug))
  .filter((icon): icon is TechIcon => Boolean(icon));

export function techIcon(slug: string): TechIcon | undefined {
  return ICON_BY_SLUG.get(slug);
}

export function hasTechIcon(slug: string) {
  return ICON_BY_SLUG.has(slug);
}

export function searchTechIcons(query: string, limit = 80) {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return TECH_ICONS.slice(0, limit);

  const relatedSlugs = new Set(
    Object.entries(IT_SUPPORT_SEARCH)
      .filter(([keyword]) => keyword.includes(normalized) || normalized.includes(keyword))
      .flatMap(([, slugs]) => slugs),
  );

  return ALL_TECH_ICONS
    .map((icon) => {
      const title = icon.label.toLowerCase();
      const slug = icon.slug.toLowerCase();
      let score = 0;
      if (title === normalized || slug === normalized) score = 100;
      else if (slug === `it-${normalized}`) score = 98;
      else if (title.startsWith(normalized) || slug.startsWith(normalized)) score = 70;
      else if (title.includes(normalized) || slug.includes(normalized)) score = 40;
      if (relatedSlugs.has(icon.slug)) score = Math.max(score, 85);
      if (icon.category === 'IT Support' && ['it', 'it support', 'infrastructure'].includes(normalized)) score = 80;
      return { icon, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.icon.label.localeCompare(b.icon.label))
    .slice(0, limit)
    .map((entry) => entry.icon);
}

export function iconUrl(slug: string) {
  const customUrl = ICON_BY_SLUG.get(slug)?.url;
  if (customUrl) return customUrl;
  return `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`;
}

export function publicTechIcon(icon: TechIcon) {
  return { ...icon, url: iconUrl(icon.slug) };
}
