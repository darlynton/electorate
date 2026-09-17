import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Candidate nominations can change before polling day. Always read the current
// verified records rather than retaining a previously empty result in cache.
export const dynamic = 'force-dynamic';

const ELECTION_SLUG = 'nigeria-general-election-2027';

/**
 * Public read model for the 2027 Election Hub. Electorate poll figures are
 * community responses, not a representative survey or an election forecast.
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { data: election, error: electionError } = await supabaseAdmin
    .from('elections')
    .select('id, name, status, source_name, source_url, last_verified_at')
    .eq('slug', ELECTION_SLUG)
    .single();

  if (electionError || !election) {
    return NextResponse.json({
      data: null,
      message: 'Election data is not yet available.',
    });
  }

  const [{ data: races }, { data: timeline }] = await Promise.all([
    supabaseAdmin
      .from('election_races')
      .select('id, slug, office, scope, election_date, status')
      .eq('election_id', election.id)
      .order('election_date'),
    supabaseAdmin
      .from('election_timeline_events')
      .select('id, event_date, title, scope, category, source_name, source_url')
      .eq('election_id', election.id)
      .order('event_date'),
  ]);

  const presidentialRace = (races ?? []).find((race) => race.office === 'president' && race.scope === 'national');
  if (!presidentialRace) {
    return NextResponse.json({ data: { election, races: races ?? [], timeline: timeline ?? [], presidential: null } });
  }

  const [{ data: candidacies }, { data: responses }] = await Promise.all([
    supabaseAdmin
      .from('candidacies')
      .select('id, party, status, announced_at, source_name, source_url, politician:politicians(id, full_name, slug, photo_url)')
      .eq('election_race_id', presidentialRace.id)
      .in('status', ['declared', 'nominated', 'confirmed'])
      .order('announced_at', { ascending: true }),
    supabaseAdmin
      .from('electorate_poll_responses')
      .select('candidacy_id')
      .eq('election_race_id', presidentialRace.id),
  ]);

  const responsesByCandidacy = (responses ?? []).reduce<Record<string, number>>((counts, response) => {
    counts[response.candidacy_id] = (counts[response.candidacy_id] ?? 0) + 1;
    return counts;
  }, {});

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const { data: authData } = token ? await supabaseAdmin.auth.getUser(token) : { data: { user: null } };
  const { data: userResponse } = authData.user
    ? await supabaseAdmin
        .from('electorate_poll_responses')
        .select('candidacy_id')
        .eq('election_race_id', presidentialRace.id)
        .eq('user_id', authData.user.id)
        .maybeSingle()
    : { data: null };

  return NextResponse.json({
    data: {
      election,
      races: races ?? [],
      timeline: timeline ?? [],
      presidential: {
        ...presidentialRace,
        candidacies: candidacies ?? [],
        electorate_poll: {
          total_responses: responses?.length ?? 0,
          responses_by_candidacy: responsesByCandidacy,
          your_response_candidacy_id: userResponse?.candidacy_id ?? null,
        },
      },
    },
  });
}
