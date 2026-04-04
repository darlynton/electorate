import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  getPoliticianType,
  getDimensionKeys,
  calculateOverallScore,
} from '@/lib/scoring';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  chamber: z.enum(['Senate', 'House', 'State Assembly', 'Executive', 'all']).optional(),
  office_level: z.enum(['federal', 'state', 'local', 'all']).optional(),
  party: z.string().optional(),
  state: z.string().optional(),
  sortBy: z.enum(['score', 'ratings']).default('score'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const validated = querySchema.parse(params);
    const { limit, chamber, office_level, party, state, sortBy } = validated;

    // 1. Fetch politicians with current positions
    let query = supabase
      .from('politicians')
      .select(`
        id,
        full_name,
        slug,
        photo_url,
        state_of_origin,
        positions!inner(
          title,
          chamber,
          office_level,
          party,
          constituency,
          state,
          is_current
        )
      `)
      .eq('positions.is_current', true);

    if (chamber && chamber !== 'all') {
      query = query.eq('positions.chamber', chamber);
    }
    if (office_level && office_level !== 'all') {
      query = query.eq('positions.office_level', office_level);
    }
    if (party && party !== 'all') {
      query = query.eq('positions.party', party);
    }
    if (state && state !== 'all') {
      query = query.eq('positions.state', state);
    }

    const { data: politicians, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    if (!politicians || politicians.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { total: 0, filters: { chamber, office_level, party, state, sortBy } },
      });
    }

    // 2. Fetch all crowd-sourced ratings
    // Use admin client so ratings are visible regardless of RLS policy state.
    // Note: avoid .in('politician_id', [...]) with large ID arrays — it generates
    // a URL that exceeds PostgREST's 16KB header limit. Fetch all rows and
    // filter client-side via the ratingsByPolitician Map below.
    const politicianIds = politicians.map((p) => p.id);
    const ratingsClient = supabaseAdmin ?? supabase;
    const { data: allRatings, error: ratErr } = await ratingsClient
      .from('politician_ratings')
      .select('*');

    if (ratErr) {
      console.error('Ratings error:', ratErr);
      // Surface table-not-found errors clearly instead of silently returning empty
      return NextResponse.json(
        { error: 'Failed to fetch ratings — check if migration 007 has been applied', details: ratErr },
        { status: 500 }
      );
    }

    // Group ratings by politician
    const ratingsByPolitician = new Map<string, Record<string, unknown>[]>();
    for (const r of allRatings || []) {
      const pid = r.politician_id as string;
      const existing = ratingsByPolitician.get(pid) || [];
      existing.push(r as Record<string, unknown>);
      ratingsByPolitician.set(pid, existing);
    }

    // 3. Calculate crowd-sourced scores
    const leaderboard = politicians.map((p: {
      id: string;
      full_name: string;
      slug: string;
      photo_url?: string;
      state_of_origin: string;
      positions: Array<{
        title: string;
        chamber: string;
        office_level: string;
        party: string;
        constituency: string;
        state: string;
      }>;
    }) => {
      const position = p.positions[0];
      const type = getPoliticianType(position?.chamber);
      const dimensionKeys = getDimensionKeys(type);
      const ratings = ratingsByPolitician.get(p.id) || [];

      // Average each dimension across all ratings
      const dimAverages: Record<string, number> = {};
      for (const key of dimensionKeys) {
        const values = ratings
          .map((r) => r[key])
          .filter((v): v is number => typeof v === 'number');
        dimAverages[key] =
          values.length > 0
            ? values.reduce((s, v) => s + v, 0) / values.length
            : 0;
      }

      const score = calculateOverallScore(dimAverages);

      return {
        rank: 0,
        politician: {
          id: p.id,
          full_name: p.full_name,
          slug: p.slug,
          photo_url: p.photo_url,
          state_of_origin: p.state_of_origin,
        },
        position: {
          title: position?.title,
          chamber: position?.chamber,
          office_level: position?.office_level,
          party: position?.party,
          constituency: position?.constituency,
          state: position?.state,
        },
        score,
        total_ratings: ratings.length,
        politician_type: type,
      };
    });

    // 4. Sort
    leaderboard.sort((a, b) => {
      if (sortBy === 'ratings') return b.total_ratings - a.total_ratings;
      if (b.score !== a.score) return b.score - a.score;
      return b.total_ratings - a.total_ratings;
    });

    // 5. Limit and assign ranks
    const limited = leaderboard.slice(0, limit);
    limited.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return NextResponse.json({
      success: true,
      data: limited,
      meta: {
        total: limited.length,
        filters: { chamber, office_level, party, state, sortBy },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
