import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { NIGERIAN_STATES } from '@/types';

/**
 * GET /api/v1/states/[state]/constituencies
 *
 * Returns all constituencies for a state with their representative(s).
 * Groups results into:
 *   - senatorial_districts  [ { district, senator } ]
 *   - federal_constituencies [ { constituency, house_rep } ]
 *
 * :state param is the URL-slug form e.g. "anambra", "cross-river", "fct"
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ state: string }> },
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { state: stateSlug } = await params;

    // Resolve slug → canonical state name
    const stateName = NIGERIAN_STATES.find(
      (s) => s.toLowerCase().replace(/\s+/g, '-') === stateSlug,
    );
    if (!stateName) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 });
    }

    // Normalise to UPPERCASE to match constituency_lga_map.state_name
    const stateNameUpper = stateName.toUpperCase();

    // ── 1. Pull distinct constituencies for this state from the map ──────────
    const { data: mapRows, error: mapErr } = await supabaseAdmin
      .from('constituency_lga_map')
      .select('federal_constituency, senatorial_district, house_rep_slug, senator_slug')
      .eq('state_name', stateNameUpper);

    if (mapErr) {
      return NextResponse.json({ error: mapErr.message }, { status: 500 });
    }

    if (!mapRows || mapRows.length === 0) {
      // Return empty but valid structure
      return NextResponse.json({
        data: {
          state: stateName,
          senatorial_districts: [],
          federal_constituencies: [],
        },
      });
    }

    // ── 2. Collect unique slugs ───────────────────────────────────────────────
    const houseSlugSet = new Set<string>();
    const senSlugSet   = new Set<string>();
    const fcMap  = new Map<string, string>();  // constituency → house_rep_slug
    const sdMap  = new Map<string, string>();  // district    → senator_slug

    for (const row of mapRows) {
      if (row.federal_constituency && !row.federal_constituency.includes('(unmapped)')) {
        fcMap.set(row.federal_constituency, row.house_rep_slug ?? '');
        if (row.house_rep_slug) houseSlugSet.add(row.house_rep_slug);
      }
      if (row.senatorial_district && !row.senatorial_district.includes('(unmapped)')) {
        sdMap.set(row.senatorial_district, row.senator_slug ?? '');
        if (row.senator_slug) senSlugSet.add(row.senator_slug);
      }
    }

    const allSlugs = [...houseSlugSet, ...senSlugSet];

    // ── 3. Fetch politician profiles for all collected slugs ──────────────────
    interface PoliticianRow {
      id: string;
      full_name: string;
      slug: string;
      photo_url: string | null;
      positions: {
        title: string;
        chamber: string;
        party: string;
        constituency: string | null;
        is_current: boolean;
      }[];
    }

    let polMap = new Map<string, PoliticianRow>();

    if (allSlugs.length > 0) {
      const { data: pols, error: polErr } = await supabaseAdmin
        .from('politicians')
        .select(`
          id, full_name, slug, photo_url,
          positions ( title, chamber, party, constituency, is_current )
        `)
        .in('slug', allSlugs);

      if (polErr) {
        return NextResponse.json({ error: polErr.message }, { status: 500 });
      }

      for (const p of (pols ?? []) as PoliticianRow[]) {
        polMap.set(p.slug, p);
      }
    }

    // ── Helper: build a representative summary object ─────────────────────────
    type RepSummary = {
      politician_id: string;
      full_name: string;
      slug: string;
      photo_url: string | null;
      party: string | null;
      title: string;
    } | null;

    function buildRep(slug: string | undefined): RepSummary {
      if (!slug) return null;
      const p = polMap.get(slug);
      if (!p) return null;
      const pos = p.positions?.find((x) => x.is_current) ?? p.positions?.[0];
      return {
        politician_id: p.id,
        full_name:     p.full_name,
        slug:          p.slug,
        photo_url:     p.photo_url,
        party:         pos?.party ?? null,
        title:         pos?.title ?? 'Legislator',
      };
    }

    // ── 4. Build response ─────────────────────────────────────────────────────

    // Senatorial districts (unique)
    const senatorial_districts = [...sdMap.entries()]
      .map(([district, slug]) => ({
        district,
        senator: buildRep(slug),
      }))
      .sort((a, b) => a.district.localeCompare(b.district));

    // Federal constituencies (unique)
    const federal_constituencies = [...fcMap.entries()]
      .map(([constituency, slug]) => ({
        constituency,
        house_rep: buildRep(slug),
      }))
      .sort((a, b) => a.constituency.localeCompare(b.constituency));

    return NextResponse.json({
      data: {
        state: stateName,
        senatorial_districts,
        federal_constituencies,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
