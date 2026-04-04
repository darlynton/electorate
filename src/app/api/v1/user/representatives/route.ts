import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/v1/user/representatives
 *
 * Returns the authenticated user's elected representatives based on their
 * saved LGA (from user_profiles.lga_id).
 *
 * Resolution chain:
 *   user_profiles.lga_id  →  constituency_lga_map  →  politicians + positions
 *
 * Response shape:
 * {
 *   data: {
 *     lga: { inec_lga_id, lga_name, state_name },
 *     representatives: [
 *       { role, politician_id, full_name, slug, photo_url, party,
 *         constituency, state, chamber, office_level },
 *       ...
 *     ]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    let userId: string | null = null;

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) userId = data.user.id;
    }

    if (!userId) {
      // Cookie fallback
      const cookieHeader = request.headers.get('cookie') ?? '';
      const match = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          const parsed = JSON.parse(decoded);
          const accessToken = parsed?.access_token || parsed?.[0];
          if (accessToken) {
            const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
            if (!error && data.user) userId = data.user.id;
          }
        } catch { /* ignore */ }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // ── Get user's LGA from their profile ─────────────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('lga_id, state_id, ward_id')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: 'Location profile not found. Please complete your location setup.' },
        { status: 404 },
      );
    }

    if (!profile.lga_id) {
      return NextResponse.json(
        { error: 'LGA not set. Please complete your location setup.' },
        { status: 422 },
      );
    }

    // ── Look up the constituency map row ──────────────────────────────────────
    const { data: mapRow, error: mapErr } = await supabaseAdmin
      .from('constituency_lga_map')
      .select('inec_lga_id, lga_name, state_name, federal_constituency, senatorial_district, house_rep_slug, senator_slug')
      .eq('inec_lga_id', profile.lga_id)
      .single();

    if (mapErr || !mapRow) {
      // Map row doesn't exist yet — constituency hasn't been seeded
      return NextResponse.json(
        {
          error: 'Constituency mapping not available for your LGA yet.',
          lga_id: profile.lga_id,
        },
        { status: 404 },
      );
    }

    // ── Fetch the politicians ─────────────────────────────────────────────────
    const slugs = [mapRow.house_rep_slug, mapRow.senator_slug].filter(Boolean) as string[];

    let representatives: Record<string, unknown>[] = [];

    if (slugs.length > 0) {
      const { data: pols, error: polErr } = await supabaseAdmin
        .from('politicians')
        .select(`
          id,
          full_name,
          slug,
          photo_url,
          state_of_origin,
          positions (
            title,
            chamber,
            office_level,
            constituency,
            state,
            party,
            is_current
          )
        `)
        .in('slug', slugs);

      if (polErr) {
        return NextResponse.json({ error: polErr.message }, { status: 500 });
      }

      representatives = (pols ?? []).map(pol => {
        const currentPos = (pol.positions as Record<string, unknown>[])?.find(
          (p) => p.is_current === true,
        );
        const isHouseRep = pol.slug === mapRow.house_rep_slug;
        const isSenator  = pol.slug === mapRow.senator_slug;

        return {
          role:           isHouseRep ? 'House Representative' : isSenator ? 'Senator' : currentPos?.title ?? 'Legislator',
          politician_id:  pol.id,
          full_name:      pol.full_name,
          slug:           pol.slug,
          photo_url:      pol.photo_url ?? null,
          party:          currentPos?.party ?? null,
          constituency:   isHouseRep ? mapRow.federal_constituency : mapRow.senatorial_district,
          state:          currentPos?.state ?? pol.state_of_origin,
          chamber:        currentPos?.chamber ?? null,
          office_level:   currentPos?.office_level ?? 'federal',
        };
      });

    }

    // ── Fetch state governor ──────────────────────────────────────────────────
    const { data: govPositions } = await supabaseAdmin
      .from('positions')
      .select(`
        party,
        politicians (
          id,
          full_name,
          slug,
          photo_url
        )
      `)
      .eq('chamber', 'Executive')
      .ilike('state', mapRow.state_name)
      .eq('is_current', true)
      .limit(1);

    if (govPositions && govPositions.length > 0) {
      const govPos = govPositions[0];
      const pol = (Array.isArray(govPos.politicians)
        ? govPos.politicians[0]
        : govPos.politicians) as Record<string, unknown> | null;
      if (pol) {
        representatives.push({
          role:           'Governor',
          politician_id:  pol.id as string,
          full_name:      pol.full_name as string,
          slug:           pol.slug as string,
          photo_url:      (pol.photo_url ?? null) as string | null,
          party:          (govPos.party ?? null) as string | null,
          constituency:   mapRow.state_name,
          state:          mapRow.state_name,
          chamber:        'Executive',
          office_level:   'state',
        });
      }
    }

    // Sort: Governor first, then Senator, then House Representative
    representatives.sort((a, b) => {
      const order: Record<string, number> = { Governor: 1, Senator: 2, 'House Representative': 3 };
      return (order[a.role as string] ?? 4) - (order[b.role as string] ?? 4);
    });

    return NextResponse.json({
      data: {
        lga: {
          inec_lga_id:          mapRow.inec_lga_id,
          lga_name:             mapRow.lga_name,
          state_name:           mapRow.state_name,
          federal_constituency: mapRow.federal_constituency,
          senatorial_district:  mapRow.senatorial_district,
        },
        representatives,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
