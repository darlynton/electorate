import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { NIGERIAN_STATES, GEOPOLITICAL_ZONES } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Get politician counts per serving state
    const { data: stateCounts, error } = await supabase
      .from('positions')
      .select('state, chamber')
      .eq('is_current', true)
      .not('state', 'is', null);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch state data' },
        { status: 500 }
      );
    }

    // Aggregate counts per state
    type PositionRow = { state: string; chamber: string | null };

    const counts: Record<string, number> = {};
    (stateCounts as PositionRow[] ?? []).forEach((p) => {
      if (!p.state) return;
      counts[p.state] = (counts[p.state] || 0) + 1;
    });

    // Get zone for each state
    const getZone = (state: string): string => {
      for (const [zone, states] of Object.entries(GEOPOLITICAL_ZONES)) {
        if (states.includes(state)) {
          return zone;
        }
      }
      return 'Unknown';
    };

    // Build state data
    const states = NIGERIAN_STATES.map((state) => ({
      name: state,
      slug: state.toLowerCase().replace(/\s+/g, '-'),
      zone: getZone(state),
      politician_count: counts[state] || 0,
      senators: 3, // Standard for all states
      average_score: 0, // No score column in DB yet
    }));

    // Group by zone
    const byZone = Object.keys(GEOPOLITICAL_ZONES).map((zone) => {
      const zoneStates = states.filter((s) => s.zone === zone);
      return {
        zone,
        states: zoneStates,
        total_politicians: zoneStates.reduce((sum, s) => sum + s.politician_count, 0),
        average_score: 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        states,
        byZone,
        totalPoliticians: Object.values(counts).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
