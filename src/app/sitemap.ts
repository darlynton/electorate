import type { MetadataRoute } from 'next';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { NIGERIAN_STATES } from '@/types';

const SITE_URL = 'https://www.electorate.ng';
const POLITICIANS_PAGE_SIZE = 500;

const staticPages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/politicians', changeFrequency: 'daily', priority: 0.9 },
  { path: '/states', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.8 },
  { path: '/election-2027', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
];

/** Refresh the generated sitemap hourly without rebuilding the application. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    ...staticPages.map(({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...NIGERIAN_STATES.map((state) => ({
      url: `${SITE_URL}/states/${state.toLowerCase().replace(/\s+/g, '-')}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  const client = supabaseAdmin ?? supabase;
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from('politicians')
      .select('slug, updated_at')
      .order('slug', { ascending: true })
      .range(from, from + POLITICIANS_PAGE_SIZE - 1);

    if (error) {
      console.error('Unable to generate politician sitemap entries:', error.message);
      break;
    }

    const politicians = data ?? [];
    entries.push(
      ...politicians.map((politician) => ({
        url: `${SITE_URL}/politicians/${politician.slug}`,
        lastModified: politician.updated_at ? new Date(politician.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    );

    if (politicians.length < POLITICIANS_PAGE_SIZE) break;
    from += POLITICIANS_PAGE_SIZE;
  }

  return entries;
}
