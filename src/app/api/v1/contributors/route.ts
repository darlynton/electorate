import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getContributorTier } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/v1/contributors
 *
 * Returns top contributors ranked by contribution_score.
 * Query params:
 *   - limit  (default 50, max 100)
 *   - page   (default 1)
 *   - state  (optional — filter by state_id)
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50')));
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const stateFilter = searchParams.get('state');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, state_id, approved_count, contribution_score, created_at', {
        count: 'exact',
      })
      .gt('contribution_score', 0)
      .order('contribution_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (stateFilter) {
      query = query.eq('state_id', stateFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Contributors fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch contributors' }, { status: 500 });
    }

    const contributors = (data ?? []).map((row, index) => {
      const tier = getContributorTier(row.contribution_score ?? 0);
      return {
        rank: offset + index + 1,
        id: row.id,
        display_name: row.display_name || 'Anonymous Citizen',
        state_id: row.state_id,
        approved_count: row.approved_count ?? 0,
        contribution_score: row.contribution_score ?? 0,
        tier: {
          key: tier.key,
          label: tier.label,
          emoji: tier.emoji,
        },
        member_since: row.created_at,
      };
    });

    // Also fetch aggregate stats
    const { data: statsData } = await supabaseAdmin
      .from('user_profiles')
      .select('contribution_score')
      .gt('contribution_score', 0);

    const totalContributors = statsData?.length ?? 0;
    const totalPoints = (statsData ?? []).reduce(
      (sum, r) => sum + (r.contribution_score ?? 0),
      0
    );

    return NextResponse.json({
      data: contributors,
      stats: {
        total_contributors: totalContributors,
        total_points: totalPoints,
      },
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('Contributors GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
