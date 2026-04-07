import { ImageResponse } from 'next/og';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import sharp from 'sharp';
import {
  getPoliticianType,
  getDimensions,
  getDimensionKeys,
  calculateOverallScore,
  type DimensionConfig,
} from '@/lib/scoring';

export const alt = 'Politician profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* ── Google Fonts URLs (TTF for Satori) ───────────────────────────────── */
const DM_SANS_REGULAR =
  'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf';
const DM_SANS_BOLD =
  'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf';
const FRAUNCES_BOLD =
  'https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcUByjDg.ttf';

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/* ── party accent colours ─────────────────────────────────────────────── */
const PARTY_COLORS: Record<string, string> = {
  APC: '#16a34a',
  PDP: '#dc2626',
  LP: '#15803d',
  NNPP: '#ca8a04',
  APGA: '#7c3aed',
};

/* ── score colour ─────────────────────────────────────────────────────── */
function scoreColor(s: number) {
  if (s >= 70) return '#16a34a';
  if (s >= 40) return '#d97706';
  return '#dc2626';
}

/* ── data fetcher ─────────────────────────────────────────────────────── */
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
  const dims = getDimensions(type);
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
    dims,
    avgs,
  };
}

/* ── fetch + convert photo to PNG data-url ────────────────────────────── */
async function fetchPhoto(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Use JPEG at quality 75 and smaller size to keep overall OG image under 200KB
    const jpegBuf = await sharp(buf)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
  } catch {
    return null;
  }
}

/* ── fallback card ────────────────────────────────────────────────────── */
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

/* ── star row helper ──────────────────────────────────────────────────── */
function renderStars(avg: number) {
  const rounded = Math.round(avg);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <div
        key={i}
        style={{
          display: 'flex',
          width: 22,
          height: 22,
          marginLeft: i > 1 ? 5 : 0,
          borderRadius: 11,
          backgroundColor: i <= rounded ? '#5D49D6' : '#ddd8ee',
        }}
      />,
    );
  }
  return stars;
}

/* ── main OG image ────────────────────────────────────────────────────── */
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
    const sc = scoreColor(p.score);
    const scoreText = p.score > 0 ? String(p.score) : '-';

    const initials = p.name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase();

    const photoSrc = p.photoUrl ? await fetchPhoto(p.photoUrl) : null;

    // Load fonts for Satori
    const [dmSansRegular, dmSansBold, frauncesFont] = await Promise.all([
      fetchFont(DM_SANS_REGULAR),
      fetchFont(DM_SANS_BOLD),
      fetchFont(FRAUNCES_BOLD),
    ]);

    const dimRows = p.dims.map((dim: DimensionConfig) => ({
      label: dim.label,
      avg: p.avgs[dim.key] ?? 0,
    }));

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#271E5D',
            fontFamily: 'DM Sans',
          }}
        >
          {/* Main body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
              paddingLeft: 56,
              paddingRight: 56,
              paddingTop: 44,
              paddingBottom: 44,
            }}
          >
            {/* ═══ Left column ═══ */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '50%',
                paddingRight: 36,
              }}
            >
              {/* Name */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 46,
                  fontWeight: 700,
                  fontFamily: 'Fraunces',
                  color: 'white',
                  marginBottom: 14,
                }}
              >
                {p.name}
              </div>

              {/* Chips row */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 18,
                }}
              >
                {p.title ? (
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: accent,
                      color: 'white',
                      paddingLeft: 16,
                      paddingRight: 16,
                      paddingTop: 5,
                      paddingBottom: 5,
                      borderRadius: 999,
                      fontSize: 17,
                      fontWeight: 700,
                      marginRight: 10,
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
                      paddingLeft: 16,
                      paddingRight: 16,
                      paddingTop: 5,
                      paddingBottom: 5,
                      borderRadius: 999,
                      fontSize: 17,
                      fontWeight: 700,
                      border: `2px solid ${accent}`,
                      marginRight: 12,
                    }}
                  >
                    {p.party}
                  </div>
                ) : null}
                {p.state ? (
                  <div
                    style={{
                      display: 'flex',
                      color: '#c4bfe6',
                      fontSize: 17,
                      fontWeight: 600,
                    }}
                  >
                    {p.state + ' State'}
                  </div>
                ) : null}
              </div>

              {/* Photo or Initials */}
              <div
                style={{
                  display: 'flex',
                  width: 300,
                  height: 300,
                  borderRadius: 20,
                  backgroundColor: '#3d3580',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8b82c8',
                  fontSize: 100,
                  fontWeight: 800,
                }}
              >
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    width={300}
                    height={300}
                    alt=""
                    style={{ borderRadius: 20 }}
                  />
                ) : (
                  initials
                )}
              </div>
            </div>

            {/* ═══ Right column – score card ═══ */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '50%',
                backgroundColor: '#f8f7ff',
                borderRadius: 20,
                paddingLeft: 32,
                paddingRight: 32,
                paddingTop: 24,
                paddingBottom: 20,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#5D49D6',
                  marginBottom: 6,
                }}
              >
                Electorating Score
              </div>

              {/* Score number */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  fontSize: 72,
                  fontWeight: 700,
                  fontFamily: 'Fraunces',
                  color: sc,
                  marginBottom: 0,
                }}
              >
                {scoreText}
              </div>

              {/* Rating count */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: '#94a3b8',
                  marginBottom: 14,
                }}
              >
                {'Based on ' +
                  String(p.ratingCount) +
                  ' Electorating' +
                  (p.ratingCount !== 1 ? 's' : '')}
              </div>

              {/* Dimension rows */}
              {dimRows.map(
                (row: { label: string; avg: number }, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 9,
                      paddingBottom: 9,
                      borderBottom:
                        i < dimRows.length - 1
                          ? '1px solid #e8e6f0'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#1e1b4b',
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                      }}
                    >
                      {renderStars(row.avg)}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

        </div>
      ),
      {
        ...size,
        fonts: [
          ...(dmSansRegular
            ? [{ name: 'DM Sans', data: dmSansRegular, weight: 400 as const }]
            : []),
          ...(dmSansBold
            ? [{ name: 'DM Sans', data: dmSansBold, weight: 700 as const }]
            : []),
          ...(frauncesFont
            ? [{ name: 'Fraunces', data: frauncesFont, weight: 700 as const }]
            : []),
        ],
      },
    );
  } catch (e) {
    console.error('OG image generation error:', e);
    return fallbackCard();
  }
}
