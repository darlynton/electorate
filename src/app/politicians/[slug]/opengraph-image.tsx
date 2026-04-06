import { ImageResponse } from 'next/og';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'Politician profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Party → accent colour
const PARTY_COLORS: Record<string, string> = {
  APC: '#16a34a',
  PDP: '#dc2626',
  LP:  '#15803d',
  NNPP: '#ca8a04',
  APGA: '#7c3aed',
};

async function getData(slug: string) {
  const client = supabaseAdmin ?? supabase;
  const { data } = await client
    .from('politicians')
    .select(`
      full_name,
      photo_url,
      state_of_origin,
      positions(party, chamber, title, is_current)
    `)
    .eq('slug', slug)
    .single();
  return data;
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getData(slug);

  // Fallback to site-wide image if politician not found
  if (!p) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#271E5D',
            color: 'white',
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Electorate
        </div>
      ),
      { ...size },
    );
  }

  const currentPos = (p.positions as { party: string; chamber: string; title: string; is_current: boolean }[] | undefined)
    ?.find((pos) => pos.is_current);

  const party = currentPos?.party ?? '';
  const chamber = currentPos?.chamber ?? '';
  const title = currentPos?.title ?? chamber;
  const accentColor = PARTY_COLORS[party] ?? '#5D49D6';
  const partyBg = accentColor + '22'; // translucent tint

  // Initials avatar fallback
  const initials = p.full_name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8f7ff',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: '100%', height: 8, background: accentColor, display: 'flex' }} />

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, padding: '48px 64px', gap: 48, alignItems: 'center' }}>
          {/* Photo / initials */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `6px solid ${accentColor}`,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#271E5D',
              color: 'white',
              fontSize: 72,
              fontWeight: 700,
            }}
          >
            {p.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.photo_url}
                alt={p.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {/* Name */}
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: '#271E5D',
                lineHeight: 1.1,
              }}
            >
              {p.full_name}
            </div>

            {/* Title + Party chips */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {title && (
                <div
                  style={{
                    background: '#271E5D',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: 999,
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  {title}
                </div>
              )}
              {party && (
                <div
                  style={{
                    background: partyBg,
                    color: accentColor,
                    padding: '8px 20px',
                    borderRadius: 999,
                    fontSize: 22,
                    fontWeight: 700,
                    border: `2px solid ${accentColor}`,
                  }}
                >
                  {party}
                </div>
              )}
            </div>

            {/* State */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 26 }}>
              <div>📍</div>
              <div>{p.state_of_origin} State</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 64px',
            background: '#271E5D',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: '#5D49D6', fontSize: 32 }}>⬡</div>
            electorate.ng
          </div>
          <div style={{ fontSize: 22, opacity: 0.8 }}>Know Who Represents You</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
