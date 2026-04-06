import type { Metadata } from 'next';
import { supabaseAdmin, supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

async function getPoliticianMeta(slug: string) {
  const client = supabaseAdmin ?? supabase;
  const { data } = await client
    .from('politicians')
    .select('full_name, photo_url, state_of_origin, biography, positions(party, chamber, title, is_current)')
    .eq('slug', slug)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPoliticianMeta(slug);

  if (!p) {
    return { title: 'Politician Not Found' };
  }

  const currentPosition = (p.positions as { party: string; chamber: string; title: string; is_current: boolean }[] | undefined)
    ?.find((pos) => pos.is_current);

  const title = `${p.full_name} | Electorate`;
  const description = currentPosition
    ? `${currentPosition.title ?? currentPosition.chamber} · ${currentPosition.party} · ${p.state_of_origin}. ${p.biography?.slice(0, 120) ?? 'Track their voting record, promises, and accountability score on Electorate.'}…`
    : p.biography?.slice(0, 155) ?? `Track ${p.full_name}'s voting record, promises, and accountability score on Electorate.`;

  const ogImage = `/politicians/${slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.electorate.ng/politicians/${slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: p.full_name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function PoliticianLayout({ children }: Props) {
  return <>{children}</>;
}
