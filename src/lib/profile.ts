export type Profile = {
  name: string;
  shortName: string;
  primaryRole: string;
  roles: string[];
  location: string;
  locationShort: string;
  focus: string;
  status: string;
  heroIntro: string;
  about: string;
  aboutSecondary: string;
  availability: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  website: string;
};

export const DEFAULT_PROFILE: Profile = {
  name: 'M. Hilmi Firjatullah Adi',
  shortName: 'M. Hilmi F.A.',
  primaryRole: 'IT Support & Full-Stack Developer',
  roles: ['IT Support Specialist', 'Full-Stack Developer', 'Systems Administrator'],
  location: 'Kendari, Indonesia',
  locationShort: 'Kendari, ID',
  focus: 'Infrastructure · Cloud · Web',
  status: 'Open to work',
  heroIntro: 'I bridge infrastructure and code to build digital experiences that feel effortless, dependable, and a little more fun.',
  about: 'I keep systems running, diagnose the tricky ones, and build the tools that make operations easier.',
  aboutSecondary: 'Working across infrastructure and software, I turn messy, complex environments into stable, well-documented ones. From network admin to shipping Next.js applications — the goal is always the same: seamless, dependable results.',
  availability: 'Open for freelance, contract, and full-time roles. If you have a system to stabilize or a product to ship, I’d love to hear about it.',
  email: 'hello@hilmi.my.id',
  phone: '',
  github: 'https://github.com/MHFADev',
  linkedin: 'https://linkedin.com/in/mhilmifa',
  website: 'https://hilmi.my.id',
};

export function normalizeProfile(value: unknown): Profile {
  if (!value || typeof value !== 'object') return DEFAULT_PROFILE;
  const input = value as Partial<Profile>;
  const text = <K extends keyof Profile>(key: K) => typeof input[key] === 'string' ? input[key] as string : DEFAULT_PROFILE[key] as string;
  return {
    name: text('name'),
    shortName: text('shortName'),
    primaryRole: text('primaryRole'),
    roles: Array.isArray(input.roles) ? input.roles.filter((role): role is string => typeof role === 'string' && Boolean(role.trim())).slice(0, 8) : DEFAULT_PROFILE.roles,
    location: text('location'),
    locationShort: text('locationShort'),
    focus: text('focus'),
    status: text('status'),
    heroIntro: text('heroIntro'),
    about: text('about'),
    aboutSecondary: text('aboutSecondary'),
    availability: text('availability'),
    email: text('email'),
    phone: text('phone'),
    github: text('github'),
    linkedin: text('linkedin'),
    website: text('website'),
  };
}
