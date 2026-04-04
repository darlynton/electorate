import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  state: z.string().optional(),
  party: z.string().optional(),
  chamber: z.enum(['Senate', 'House', 'State Assembly', 'Executive', 'all']).optional(),
  office_level: z.enum(['federal', 'state', 'local', 'all']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'score', 'state']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = querySchema.parse(params);
    const { page, limit, state, party, chamber, office_level, search, sortBy, order } = validated;
    
    const offset = (page - 1) * limit;

    // Use the public client (with RLS)
    const client = supabase;

    // Build the query
    let query = client
      .from('politicians')
      .select(`
        *,
        positions!inner(
          id,
          title,
          chamber,
          constituency,
          state,
          party,
          office_level,
          assembly_number,
          start_date,
          is_current
        )
      `, { count: 'exact' });

    // Only get current positions
    query = query.eq('positions.is_current', true);

    // Apply filters
    if (state && state !== 'all') {
      query = query.eq('positions.state', state);
    }
    
    if (party && party !== 'all') {
      query = query.eq('positions.party', party);
    }
    
    if (chamber && chamber !== 'all') {
      query = query.eq('positions.chamber', chamber);
    }

    if (office_level && office_level !== 'all') {
      query = query.eq('positions.office_level', office_level);
    }
    
    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    // Apply sorting
    if (sortBy === 'name') {
      query = query.order('full_name', { ascending: order === 'asc' });
    } else if (sortBy === 'state') {
      query = query.order('state_of_origin', { ascending: order === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: politicians, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch politicians', details: error.message },
        { status: 500 }
      );
    }

    // Fetch community ratings (use admin client to bypass RLS)
    const adminClient = supabaseAdmin ?? supabase;
    const { data: ratings, error: ratingsError } = await adminClient
      .from('politician_ratings')
      .select('politician_id, constituency_presence, legislative_activity, constituency_projects, accessibility, transparency, infrastructure, security, healthcare_education, economic_activity, transparency_communication');

    if (ratingsError) console.error('Ratings fetch error:', ratingsError.message);

    // Build community score map: id → average of dimension averages × 20 (same as scoring lib)
    const ratingSum: Record<string, number> = {};
    const ratingCount: Record<string, number> = {};
    for (const r of (ratings ?? [])) {
      const dims = [r.constituency_presence, r.legislative_activity, r.constituency_projects, r.accessibility, r.transparency, r.infrastructure, r.security, r.healthcare_education, r.economic_activity, r.transparency_communication];
      const scored = dims.filter((v: number | null) => v != null && v > 0) as number[];
      if (scored.length === 0) continue;
      const avg = scored.reduce((s: number, v: number) => s + v, 0) / scored.length;
      ratingSum[r.politician_id] = (ratingSum[r.politician_id] ?? 0) + avg;
      ratingCount[r.politician_id] = (ratingCount[r.politician_id] ?? 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: (politicians ?? []).map((p) => {
        const cnt = ratingCount[p.id] ?? 0;
        const community_score = cnt > 0 ? Math.round(((ratingSum[p.id] ?? 0) / cnt) * 20) : 0;
        return { ...p, accountability_score: community_score, community_score, total_ratings: cnt };
      }),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
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
