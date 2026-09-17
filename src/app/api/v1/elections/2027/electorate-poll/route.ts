import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const PRESIDENTIAL_RACE_SLUG = '2027-president-national';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token || !supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const candidacyId = typeof body?.candidacy_id === 'string' ? body.candidacy_id : null;
  if (!candidacyId) return NextResponse.json({ error: 'Select a candidate to submit your response' }, { status: 400 });

  const { data: race, error: raceError } = await supabaseAdmin
    .from('election_races')
    .select('id')
    .eq('slug', PRESIDENTIAL_RACE_SLUG)
    .single();
  if (raceError || !race) return NextResponse.json({ error: 'Presidential race not found' }, { status: 404 });

  const { data: candidacy, error: candidacyError } = await supabaseAdmin
    .from('candidacies')
    .select('id')
    .eq('id', candidacyId)
    .eq('election_race_id', race.id)
    .in('status', ['declared', 'nominated', 'confirmed'])
    .maybeSingle();
  if (candidacyError || !candidacy) {
    return NextResponse.json({ error: 'That candidate is not available in this poll' }, { status: 400 });
  }

  const { data: existingResponse, error: existingResponseError } = await supabaseAdmin
    .from('electorate_poll_responses')
    .select('candidacy_id')
    .eq('election_race_id', race.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingResponseError) return NextResponse.json({ error: existingResponseError.message }, { status: 500 });
  if (existingResponse) {
    return NextResponse.json(
      { error: 'Your Electorate poll response has already been recorded and cannot be changed.' },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin.from('electorate_poll_responses').insert({
    election_race_id: race.id,
    candidacy_id: candidacy.id,
    user_id: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { candidacy_id: candidacy.id } });
}
