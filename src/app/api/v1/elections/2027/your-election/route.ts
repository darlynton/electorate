import { NextRequest, NextResponse } from 'next/server';
import { getStates } from 'nigerian-states-lgas-and-polling-units';
import { GEOPOLITICAL_ZONES } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Resolves only the geographic context necessary to explain a signed-in user's
 * relevant races. It does not expose a polling unit or infer local polling.
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('state_id, lga_id, ward_id')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile?.state_id || !profile.lga_id || !profile.ward_id) {
    return NextResponse.json({ data: null, configured: false });
  }

  const state = (getStates() as Array<{ id: string; name: string }>).find((item) => item.id === profile.state_id);
  const stateName = state ? titleCase(state.name) : profile.state_id;
  const geopoliticalZone = Object.entries(GEOPOLITICAL_ZONES)
    .find(([, states]) => states.includes(stateName))?.[0] ?? null;

  const [{ data: constituencyMap }, { data: ward }] = await Promise.all([
    supabaseAdmin
      .from('constituency_lga_map')
      .select('federal_constituency, senatorial_district')
      .eq('inec_lga_id', profile.lga_id)
      .maybeSingle(),
    supabaseAdmin
      .from('inec_wards')
      .select('state_constituency:state_constituencies(name)')
      .eq('id', profile.ward_id)
      .maybeSingle(),
  ]);

  const stateConstituency = ward?.state_constituency as unknown as { name: string } | null;
  return NextResponse.json({
    configured: true,
    data: {
      state: stateName,
      geopolitical_zone: geopoliticalZone,
      senatorial_district: constituencyMap?.senatorial_district ?? null,
      federal_constituency: constituencyMap?.federal_constituency ?? null,
      state_constituency: stateConstituency?.name ?? null,
    },
  });
}
