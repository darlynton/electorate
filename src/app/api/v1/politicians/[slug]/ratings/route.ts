import { NextRequest, NextResponse } from 'next/server';
import { getState } from 'nigerian-states-lgas-and-polling-units';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  getPoliticianType,
  getDimensionKeys,
  getDimensions,
  calculateOverallScore,
  getCurrentRatingPeriod,
} from '@/lib/scoring';

// Normalize state name: lowercase and strip trailing " state" for comparison
// e.g. "ANAMBRA STATE" → "anambra"  |  "Anambra" → "anambra"
function normalizeState(s: string): string {
  return s.toLowerCase().replace(/\s+state$/i, '').trim();
}

// ── GET /api/v1/politicians/[slug]/ratings ──────────────────────────────────
// Returns aggregated crowd-sourced scores + optional current user's rating
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Get politician + current position to determine type
    const { data: politician, error: polErr } = await supabase
      .from('politicians')
      .select(`id, positions!inner(chamber, state, is_current)`)
      .eq('slug', slug)
      .eq('positions.is_current', true)
      .single();

    if (polErr || !politician) {
      return NextResponse.json({ error: 'Politician not found' }, { status: 404 });
    }

    const posRow = (politician.positions as Array<{ chamber: string; state: string }>)?.[0];
    const chamber = posRow?.chamber;
    const positionState = posRow?.state ?? '';
    const type = getPoliticianType(chamber);
    const dimensionKeys = getDimensionKeys(type);
    const dimensionConfigs = getDimensions(type);

    // 2. Fetch ALL ratings for this politician
    // Use admin client so ratings are visible regardless of RLS policy state
    const ratingsClient = supabaseAdmin ?? supabase;
    const { data: ratings, error: ratErr } = await ratingsClient
      .from('politician_ratings')
      .select('*')
      .eq('politician_id', politician.id);

    if (ratErr) {
      console.error('Ratings fetch error:', ratErr);
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    const allRatings = ratings || [];

    // 3. Aggregate each dimension
    const dimensionAggregates: Record<string, { sum: number; count: number }> = {};
    for (const key of dimensionKeys) {
      dimensionAggregates[key] = { sum: 0, count: 0 };
    }

    for (const r of allRatings) {
      for (const key of dimensionKeys) {
        const val = (r as Record<string, unknown>)[key];
        if (val != null && typeof val === 'number') {
          dimensionAggregates[key].sum += val;
          dimensionAggregates[key].count += 1;
        }
      }
    }

    const dimensions = dimensionKeys.map((key) => {
      const { sum, count } = dimensionAggregates[key];
      const config = dimensionConfigs.find((d) => d.key === key);
      return {
        key,
        label: config?.label ?? key,
        emoji: config?.emoji ?? '',
        average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        count,
      };
    });

    // 4. Calculate overall
    const avgScores: Record<string, number> = {};
    for (const d of dimensions) {
      avgScores[d.key] = d.average;
    }
    const overall = calculateOverallScore(avgScores);

    // 5. Check authenticated user's current rating + constituency (optional)
    let userRating: Record<string, number> | null = null;
    let canRate = true;
    let inConstituency = false;
    let hasLocation = false;
    let cantRateReason: 'monthly_limit' | 'constituency' | 'no_location' | null = null;
    let nextRatingDate: string | null = null;

    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (token && supabaseAdmin) {
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      if (authData?.user) {
        const userId = authData.user.id;

        // Check constituency: user's state must match position's state
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('state_id')
          .eq('id', userId)
          .single();

        if (userProfile?.state_id) {
          hasLocation = true;
          // Resolve state name from the npm package (works without DB seeding)
          const stateInfo = getState(userProfile.state_id) as { id: string; name: string } | null;
          const userStateName = stateInfo?.name ?? '';

          if (userStateName && positionState) {
            inConstituency =
              normalizeState(userStateName) === normalizeState(positionState);
          }
        }

        if (!hasLocation) {
          canRate = false;
          cantRateReason = 'no_location';
        } else if (!inConstituency) {
          canRate = false;
          cantRateReason = 'constituency';
        } else {
          // Check monthly limit
          const period = getCurrentRatingPeriod();
          const { data: existing } = await supabaseAdmin
            .from('politician_ratings')
            .select('*')
            .eq('user_id', userId)
            .eq('politician_id', politician.id)
            .eq('rating_period', period)
            .single();

          if (existing) {
            canRate = false;
            cantRateReason = 'monthly_limit';
            const [y, m] = period.split('-').map(Number);
            const nextMonth = m === 12 ? 1 : m + 1;
            const nextYear = m === 12 ? y + 1 : y;
            nextRatingDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

            userRating = {};
            for (const key of dimensionKeys) {
              const val = (existing as Record<string, unknown>)[key];
              if (val != null && typeof val === 'number') {
                userRating[key] = val;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        politician_id: politician.id,
        politician_type: type,
        overall,
        total_ratings: allRatings.length,
        dimensions,
        user_rating: userRating,
        can_rate: canRate,
        cant_rate_reason: cantRateReason,
        in_constituency: inConstituency,
        has_location: hasLocation,
        next_rating_date: nextRatingDate,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/v1/politicians/[slug]/ratings ─────────────────────────────────
// Submit or update a monthly rating (requires authentication)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // 1. Authenticate
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 });
    }
    const userId = authData.user.id;

    // 2. Get politician + position
    const { data: politician, error: polErr } = await supabaseAdmin
      .from('politicians')
      .select(`id, positions!inner(chamber, state, is_current)`)
      .eq('slug', slug)
      .eq('positions.is_current', true)
      .single();

    if (polErr || !politician) {
      return NextResponse.json({ error: 'Politician not found' }, { status: 404 });
    }

    const posRow2 = (politician.positions as Array<{ chamber: string; state: string }>)?.[0];
    const chamber = posRow2?.chamber;
    const positionState = posRow2?.state ?? '';
    const type = getPoliticianType(chamber);
    const dimensionKeys = getDimensionKeys(type);

    // 3. Constituency check
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('state_id')
      .eq('id', userId)
      .single();

    if (!userProfile?.state_id) {
      return NextResponse.json(
        { error: 'You must set your location before rating officials' },
        { status: 403 }
      );
    }

    // Resolve state name from npm package (works without DB seeding)
    const stateInfo = getState(userProfile.state_id) as { id: string; name: string } | null;
    const userStateName = stateInfo?.name ?? '';

    if (!userStateName || normalizeState(userStateName) !== normalizeState(positionState)) {
      return NextResponse.json(
        { error: 'You can only rate officials who represent your constituency' },
        { status: 403 }
      );
    }

    // 3. Parse and validate body
    const body = await request.json();
    const scores = body.scores as Record<string, number> | undefined;
    const comment = body.comment as string | undefined;

    if (!scores || typeof scores !== 'object') {
      return NextResponse.json({ error: 'Scores object is required' }, { status: 400 });
    }

    // Validate all dimensions are present and between 1-5
    for (const key of dimensionKeys) {
      const val = scores[key];
      if (val == null || !Number.isInteger(val) || val < 1 || val > 5) {
        return NextResponse.json(
          { error: `Invalid score for ${key}: must be an integer between 1 and 5` },
          { status: 400 }
        );
      }
    }

    const period = getCurrentRatingPeriod();

    // 4. Check if already rated this month
    const { data: existing } = await supabaseAdmin
      .from('politician_ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('politician_id', politician.id)
      .eq('rating_period', period)
      .single();

    // 5. Build DB record
    const record: Record<string, unknown> = {
      user_id: userId,
      politician_id: politician.id,
      rating_period: period,
      comment: comment?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Set dimension scores (only for the relevant type, leave others null)
    for (const key of dimensionKeys) {
      record[key] = scores[key];
    }

    if (existing) {
      // Update existing rating for this month
      const { error: updateErr } = await supabaseAdmin
        .from('politician_ratings')
        .update(record)
        .eq('id', existing.id);

      if (updateErr) {
        console.error('Update error:', updateErr);
        return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Rating updated' });
    } else {
      // Insert new rating
      record.created_at = new Date().toISOString();
      const { error: insertErr } = await supabaseAdmin
        .from('politician_ratings')
        .insert(record);

      if (insertErr) {
        console.error('Insert error:', insertErr);
        return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
      }

      return NextResponse.json(
        { success: true, message: 'Rating submitted' },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
