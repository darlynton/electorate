import { ImageResponse } from 'next/og';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import {
  getPoliticianType,
  getDimensionKeys,
  calculateOverallScore,
} from '@/lib/scoring';

export const runtime = 'edge';
export const alt = 'Politician profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PARTY_COLORS: Record<string, string> = {
  APC:  '#16a34a',
  PDP:  '#dc2626',
  LP:   '#15803d',
  NNPP: '#ca8a04',
  APGA: '#7c3aed',
};

function scoreColor(score: number) {
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score > 0)  return 'Poor';
  return 'No Electoratings';
}

async function getData(slug: string) {
  const client = supabaseAdmin ?? supabase;

  // Politician basics
  const { data: p } = await client
    .from('politicians')
    .select('id, full_name, photo_url, state_of_origin, positions(party, chamber, title, is_current)')
    .eq('slug', slug)
    .single();

  if (!p) return null;

  // Ratings for score
  const { data: ratings } = await (supabaseAdmin ?? supabase)
    .from('politician_ratings')
    .select('*')
    .eq('politician_id', p.id);

  const allRatings = ratings ?? [];
  const currentPos = (p.positions as { party: string; chamber: string; title: string; is_current: boolean }[] | undefined)
    ?.find((pos) => pos.is_current);
  const chamber = currentPos?.chamber ?? '';
  const type = getPoliticianType(chamber);
  const keys = getDimensionKeys(type);

  const avgs: Record<string, number> = {};
  for (const key of keys) {
    const vals = allRatings
      .map((r) => (r as Record<string, unknown>)[key])
      .filter((v): v is number => typeof v === 'number');
    avgs[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  const overall = allRatings.length > 0 ? calculateOverallScore(avgs) : 0;
  const totalRatings = allRatings.length;

  return { ...p, currentPos, overall, totalRatings };
}

// Fetch a remote image and return a data URL usable inside ImageResponse
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    const b64 = Buffer.from(buffer).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getData(slug);

  if (!p) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#271E5D', color: 'white', fontSize: 48, fontWeight: 700 }}>
        Electorate
      </div>,
      { ...size },
    );
  }

  const party       = p.currentPos?.party ?? '';
  const titleText   = p.currentPos?.title ?? p.currentPos?.chamber ?? '';
  const accentColor = PARTY_COLORS[party] ?? '#5D49D6';
  const partyBg     = accentColor + '28';
  const score       = Math.round(p.overall);
  const sc          = scoreColor(score);
  const sl          = scoreLabel(score);

  // Initials fallback
  const initials = p.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  // Convert photo to base64 so it renders in edge ImageResponse
  const photoDataUrl = p.photo_url ? await toDataUrl(p.photo_url) : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f7ff', fontFamily: 'sans-serif', overflow: 'hidden' }}>

        {/* Top accent bar */}
        <div style={{ width: '100%', height: 10, background: accentColor, display: 'flex' }} />

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, padding: '44px 64px', gap: 52, alignItems: 'center' }}>

          {/* Photo / initials */}
          <div style={{
            width: 210, height: 210, borderRadius: '50%', overflow: 'hidden',
            border: `6px solid ${accentColor}`, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#271E5D', color: 'white', fontSize: 76, fontWeight: 800,
          }}>
            {photoDataUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          {/* Info column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>

            {/* Name */}
            <div style={{ fontSize: 54, fontWeight: 800, color: '#271E5D', lineHeight: 1.1 }}>
              {p.full_name}
            </div>

            {/* Title + Party chips */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {titleText && (
                <div style={{ background: '#271E5D', color: 'white', padding: '8px 22px', borderRadius: 999, fontSize: 22, fontWeight: 600 }}>
                  {titleText}
                </div>
              )}
              {party && (
                <div style={{ background: partyBg, color: accentColor, padding: '8px 22px', borderRadius: 999, fontSize: 22, fontWeight: 700, border: `2px solid ${accentColor}` }}>
                  {party}
                </div>
              )}
            </div>

            {/* State + Electorating score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 24 }}>
                <div>📍</div>
                <div>{p.state_of_origin} State</div>
              </div>

              {/* Score pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: sc + '18', border: `2px solid ${sc}`, borderRadius: 999, padding: '6px 20px' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: sc }}>{score > 0 ? score : '–'}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sc }}>{sl}</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{p.totalRatings} Electorating{p.totalRatings !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 64px', background: '#271E5D', color: 'white' }}>
          <div style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#7C6FE0', fontSize: 30 }}>⬡</div>
            electorate.ng
          </div>
          <div style={{ fontSize: 21, opacity: 0.75 }}>Know Who Represents You</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
