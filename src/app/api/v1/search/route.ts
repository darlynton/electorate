import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { isSupabaseMock, searchMockPoliticians } from '@/lib/mock-data';

const searchSchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).default(10),
  type: z.enum(['all', 'politicians', 'states', 'bills']).default('all'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validated = searchSchema.parse(params);
    const { q: query, limit, type } = validated;

    const results: {
      politicians: Array<{
        id: string;
        slug: string;
        full_name: string;
        state_of_origin: string;
        photo_url?: string;
        position?: {
          title: string;
          party: string;
          chamber: string;
        };
      }>;
      states: Array<{
        name: string;
        slug: string;
        politician_count: number;
      }>;
      bills: Array<{
        id: string;
        title: string;
        description?: string;
        vote_date: string;
      }>;
    } = {
      politicians: [],
      states: [],
      bills: [],
    };

    // Search politicians
    if (type === 'all' || type === 'politicians') {
      // Use mock data when Supabase is not configured
      if (isSupabaseMock()) {
        results.politicians = searchMockPoliticians(query, limit);
      } else {
        const { data: politicians, error } = await supabase
          .from('politicians')
          .select(`
            id,
            slug,
            full_name,
            state_of_origin,
            photo_url,
            positions!inner(
              title,
              party,
              chamber,
              is_current
            )
          `)
          .eq('positions.is_current', true)
          .or(`full_name.ilike.%${query}%,state_of_origin.ilike.%${query}%`)
          .limit(limit);

        if (!error && politicians) {
          results.politicians = politicians.map((p: {
            id: string;
            slug: string;
            full_name: string;
            state_of_origin: string;
            photo_url?: string;
            positions: Array<{
              title: string;
              party: string;
              chamber: string;
            }>;
          }) => ({
            id: p.id,
            slug: p.slug,
            full_name: p.full_name,
            state_of_origin: p.state_of_origin,
            photo_url: p.photo_url,
            position: p.positions?.[0] ? {
              title: p.positions[0].title,
              party: p.positions[0].party,
              chamber: p.positions[0].chamber,
            } : undefined,
          }));
        }
      }
    }

    // Search states (from politicians' states)
    if (type === 'all' || type === 'states') {
      const { data: states, error } = await supabase
        .from('politicians')
        .select('state_of_origin')
        .ilike('state_of_origin', `%${query}%`);

      if (!error && states) {
        // Group by state and count
        const stateCounts: Record<string, number> = {};
        states.forEach((s: { state_of_origin: string }) => {
          stateCounts[s.state_of_origin] = (stateCounts[s.state_of_origin] || 0) + 1;
        });

        results.states = Object.entries(stateCounts)
          .slice(0, limit)
          .map(([name, count]) => ({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            politician_count: count,
          }));
      }
    }

    // Search bills (from votes)
    if (type === 'all' || type === 'bills') {
      const { data: votes, error } = await supabase
        .from('votes')
        .select('id, bill_title, vote_date')
        .ilike('bill_title', `%${query}%`)
        .limit(limit);

      if (!error && votes) {
        // Deduplicate by bill_title
        const uniqueBills = new Map<string, { id: string; bill_title: string; vote_date: string }>();
        votes.forEach((v) => {
          const vote = v as { id: string; bill_title: string; vote_date: string };
          if (!uniqueBills.has(vote.bill_title)) {
            uniqueBills.set(vote.bill_title, vote);
          }
        });

        results.bills = Array.from(uniqueBills.values()).map((v) => ({
          id: v.id,
          title: v.bill_title,
          vote_date: v.vote_date,
        }));
      }
    }

    const totalResults = 
      results.politicians.length + 
      results.states.length + 
      results.bills.length;

    return NextResponse.json({
      success: true,
      query,
      total: totalResults,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
