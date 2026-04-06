import { ImageResponse } from 'next/og';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import sharp from 'sharp';
import {
  getPoliticianType,
  getDimensionKeys,
  calculateOverallScore,
} from '@/lib/scoring';

export const alt = 'Politician profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PARTY_COLORS: Record<string, string> = {
  APC: '#16a34a',
  PDP: '#dc2626',
  LP: '#15803d',
  NNPP: '#ca8a04',
  APGA: '#7c3aed',
};

function getScoreColor(s: number) {
  if (s >= 70) return '#16a34a';
  if (s >= 40) return '#d97706';
  return '#dc2626';
}

function getScoreLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  if (s > 0) return 'Poor';
  return 'Unrated';
}

async function getData(slug: string) {
  const client = supabaseAdmin ?? supabase;

  const { data: p } = await client
    .from('politicians')
    .select(
      'id, full_name, photo_url, state_of_origin, positions(party, chamber, title, is_current)',
    )
    .eq('slug', slug)
    .single();

  if (!p) return null;

  const { data: ratings } = await client
    .from('politician_ratings')
    .select('*')
    .eq('politician_id', p.id);

  const allRatings = ratings ?? [];
  const currentPos = (
    p.positions as
      | { party: string; chamber: string; title: string; is_current: boolean }[]
      | undefined
  )?.find((pos) => pos.is_current);

  const chamber = currentPos?.chamber ?? '';
  const type = getPoliticianType(chamber);
  const keys = getDimensionKeys(type);

  const avgs: Record<string, number> = {};
  for (const key of keys) {
    const vals = allRatings
      .map((r) => (r as Record<string, unknown>)[key])
      .filter((v): v is number => typeof v === 'number');
    avgs[key] = vals.length
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : 0;
  }
  const overall = allRatings.length > 0 ? calculateOverallScore(avgs) : 0;

  return {
    name: String(p.full_name),
    photoUrl: p.photo_url ? String(p.photo_url) : null,
    state: p.state_of_origin ? String(p.state_of_origin) : '',
    party: currentPos?.party ? String(currentPos.party) : '',
    title: currentPos?.title
      ? String(currentPos.title)
      : currentPos?.chamber
        ? String(currentPos.chamber)
        : '',
    score: Math.round(overall),
    ratingCount: allRatings.length,
  };
}

async function fetchImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());

    // Convert to PNG because Satori does not support WebP
    const pngBuf = await sharp(buf).resize(200, 200).png().toBuffer();
    return `data:image/png;base64,${pngBuf.toString('base64')}`;
  } catch {
    return null;
  }
}

function fallbackCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#271E5D',
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

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const p = await getData(slug);

    if (!p) return fallbackCard();

    const accent = PARTY_COLORS[p.party] ?? '#5D49D6';
    const sc = getScoreColor(p.score);
    const sl = getScoreLabel(p.score);
    const scoreText = p.score > 0 ? String(p.score) : '-';
    const ratingText =
      String(p.ratingCount) +
      (p.ratingCount === 1 ? ' rating' : ' ratings');

    const initials = p.name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase();

    // Fetch photo as PNG data-url for Satori
    const photoSrc = p.photoUrl ? await fetchImage(p.photoUrl) : null;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#f8f7ff',
          }}
        >
          {/* Accent bar */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 10,
              backgroundColor: accent,
            }}
          />

          {/* Main body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              paddingLeft: 64,
              paddingRight: 64,
              paddingTop: 44,
              paddingBottom: 44,
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: '#271E5D',
                color: 'white',
                fontSize: 72,
                fontWeight: 700,
                border: `5px solid ${accent}`,
                marginRight: 48,
              }}
            >
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoSrc}
                  width={200}
                  height={200}
                  alt=""
                  style={{ borderRadius: 100 }}
                />
              ) : (
                initials
              )}
            </div>

            {/* Text column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              {/* Name */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 52,
                  fontWeight: 800,
                  color: '#271E5D',
                  marginBottom: 16,
                }}
              >
                {p.name}
              </div>

              {/* Chips row */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  marginBottom: 16,
                }}
              >
                {p.title ? (
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: '#271E5D',
                      color: 'white',
                      paddingLeft: 20,
                      paddingRight: 20,
                      paddingTop: 8,
                      paddingBottom: 8,
                      borderRadius: 999,
                      fontSize: 22,
                      fontWeight: 600,
                      marginRight: 12,
                    }}
                  >
                    {p.title}
                  </div>
                ) : null}
                {p.party ? (
                  <div
                    style={{
                      display: 'flex',
                      color: accent,
                      paddingLeft: 20,
                      paddingRight: 20,
                      paddingTop: 8,
                      paddingBottom: 8,
                      borderRadius: 999,
                      fontSize: 22,
                      fontWeight: 700,
                      border: `2px solid ${accent}`,
                    }}
                  >
                    {p.party}
                  </div>
                ) : null}
              </div>

              {/* State + Score row */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {p.state ? (
                  <div
                    style={{
                      display: 'flex',
                      color: '#64748b',
                      fontSize: 24,
                      marginRight: 32,
                    }}
                  >
                    {p.state + ' State'}
                  </div>
                ) : null}

                {/* Score badge */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    border: `2px solid ${sc}`,
                    borderRadius: 999,
                    paddingLeft: 18,
                    paddingRight: 18,
                    paddingTop: 6,
                    paddingBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 30,
                      fontWeight: 800,
                      color: sc,
                      marginRight: 10,
                    }}
                  >
                    {scoreText}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 14,
                        fontWeight: 700,
                        color: sc,
                      }}
                    >
                      {sl}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 13,
                        color: '#94a3b8',
                      }}
                    >
                      {ratingText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 64,
              paddingRight: 64,
              paddingTop: 18,
              paddingBottom: 18,
              backgroundColor: '#271E5D',
              color: 'white',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              electorate.ng
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 21,
                color: '#a5a0cc',
              }}
            >
              Know Who Represents You
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  } catch (e) {
    console.error('OG image generation error:', e);
    return fallbackCard();
  }
}
