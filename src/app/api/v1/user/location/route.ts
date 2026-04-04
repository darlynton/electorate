import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPollingUnitsByWard } from 'nigerian-states-lgas-and-polling-units';
import { supabaseAdmin } from '@/lib/supabase';

const locationSchema = z.object({
  state_id: z.string().min(1),
  lga_id: z.string().min(1),
  ward_id: z.string().min(1),
  polling_unit_id: z.string().min(1).optional(),
});

/**
 * GET /api/v1/user/location — get current user's location profile
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    // Also check cookie-based auth for client components using fetch with credentials
    let userId: string | null = null;

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) userId = data.user.id;
    }

    if (!userId) {
      // Try cookie-based session
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // Attempt to extract the access token from the sb-*-auth-token cookie
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
          } catch { /* ignore parse errors */ }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: profile ?? null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/user/location — set or update user location (6-month restriction)
 */
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Authenticate
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    let userId: string | null = null;
    let userPhone: string | null = null;

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) {
        userId = data.user.id;
        userPhone = data.user.phone ?? null;
      }
    }

    if (!userId) {
      // Fallback: try to get user from the Supabase auth cookie
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
        if (match) {
          try {
            const decoded = decodeURIComponent(match[1]);
            const parsed = JSON.parse(decoded);
            const accessToken = parsed?.access_token || parsed?.[0];
            if (accessToken) {
              const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
              if (!error && data.user) {
                userId = data.user.id;
                userPhone = data.user.phone ?? null;
              }
            }
          } catch { /* ignore */ }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid location data', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { state_id, lga_id, ward_id, polling_unit_id } = parsed.data;

    // Check existing profile
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, location_last_updated_at')
      .eq('id', userId)
      .single();

    if (existingProfile?.location_last_updated_at) {
      const lastUpdated = new Date(existingProfile.location_last_updated_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastUpdated > sixMonthsAgo) {
        const nextAllowed = new Date(lastUpdated);
        nextAllowed.setMonth(nextAllowed.getMonth() + 6);
        return NextResponse.json(
          {
            error: `Location can only be changed once every 6 months. Next allowed: ${nextAllowed.toISOString().split('T')[0]}`,
          },
          { status: 403 },
        );
      }
    }

    // Validate polling unit only if provided
    if (polling_unit_id) {
      const wardUnits = getPollingUnitsByWard(ward_id) as { id: string; name: string }[];
      const puValid = wardUnits.some((p) => p.id === polling_unit_id);
      if (!puValid) {
        return NextResponse.json(
          { error: 'Invalid polling unit / ward combination' },
          { status: 400 },
        );
      }
    }

    // Upsert profile
    const profileData: Record<string, unknown> = {
      id: userId,
      state_id,
      lga_id,
      ward_id,
      location_verified: true,
      location_last_updated_at: new Date().toISOString(),
    };

    if (polling_unit_id) {
      profileData.polling_unit_id = polling_unit_id;
    }

    // Include phone if available (from user metadata)
    if (userPhone) {
      profileData.phone_number = userPhone;
    }

    const { data: saved, error: saveError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (saveError) {
      console.error('Profile save error:', saveError);
      return NextResponse.json({ error: 'Failed to save location' }, { status: 500 });
    }

    return NextResponse.json({ data: saved });
  } catch (err) {
    console.error('Location update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
