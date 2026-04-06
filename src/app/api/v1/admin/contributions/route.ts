import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Check whether the authenticated user is an admin.
 * Returns the userId on success or a NextResponse error.
 */
async function requireAdmin(request: NextRequest): Promise<
  { userId: string } | NextResponse
> {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 });
  }

  const userId = authData.user.id;

  // Verify admin flag in user_profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return { userId };
}

// ── GET /api/v1/admin/contributions ──────────────────────────────────────────
// Lists edit suggestions with optional status filter and pagination.
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending | approved | rejected
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin!
      .from('edit_suggestions')
      .select(
        `*, politician:politicians!edit_suggestions_politician_id_fkey(full_name, slug)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Admin contributions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('Admin GET contributions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH /api/v1/admin/contributions ────────────────────────────────────────
// Approve or reject a suggestion. On approve for suggest_edit, apply the change.
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const { id, action, reviewer_note } = body as {
      id?: string;
      action?: 'approve' | 'reject';
      reviewer_note?: string;
    };

    if (!id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'id and action (approve|reject) are required' },
        { status: 400 }
      );
    }

    // Fetch the suggestion
    const { data: suggestion, error: fetchErr } = await supabaseAdmin!
      .from('edit_suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { error: `Suggestion already ${suggestion.status}` },
        { status: 409 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update suggestion status
    const { error: updateErr } = await supabaseAdmin!
      .from('edit_suggestions')
      .update({
        status: newStatus,
        reviewer_id: userId,
        reviewed_at: new Date().toISOString(),
        reviewer_note: reviewer_note ?? null,
      })
      .eq('id', id);

    if (updateErr) {
      console.error('Suggestion update failed:', updateErr);
      return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
    }

    // ── Apply changes on approval ─────────────────────────────────────────
    if (action === 'approve') {
      if (suggestion.submission_type === 'suggest_edit' && suggestion.politician_id) {
        await applySuggestEdit(suggestion);
      } else if (suggestion.submission_type === 'add_official') {
        await applyAddOfficial(suggestion);
      }

      // Award contribution points to the submitter
      if (suggestion.submitted_by) {
        const points = suggestion.submission_type === 'add_official' ? 25 : 10;
        const { data: profile } = await supabaseAdmin!
          .from('user_profiles')
          .select('approved_count, contribution_score')
          .eq('id', suggestion.submitted_by as string)
          .single();

        if (profile) {
          await supabaseAdmin!
            .from('user_profiles')
            .update({
              approved_count: (profile.approved_count ?? 0) + 1,
              contribution_score: (profile.contribution_score ?? 0) + points,
            })
            .eq('id', suggestion.submitted_by as string);
        }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Admin PATCH contributions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function applySuggestEdit(suggestion: Record<string, unknown>) {
  const payload = suggestion.payload as {
    field_name: string;
    proposed_value: string;
  };
  if (!payload?.field_name) return;

  // Only allow known safe columns to be updated
  const allowedFields = [
    'full_name', 'biography', 'date_of_birth', 'gender', 'state_of_origin',
    'lga_of_origin', 'photo_url',
    'contact_phone', 'contact_email', 'office_address',
    'website_url', 'twitter_handle', 'facebook_url',
    'instagram_handle', 'tiktok_handle', 'youtube_url', 'linkedin_url',
  ];

  const field = payload.field_name;

  // For photo_url: the uploaded image is stored in suggestion.image_url.
  // proposed_value is just a description the user typed — use image_url instead.
  const effectiveValue =
    field === 'photo_url' && suggestion.image_url
      ? (suggestion.image_url as string)
      : payload.proposed_value;

  if (!effectiveValue) return;

  if (allowedFields.includes(field)) {
    // Direct column update on the politicians table
    const { error } = await supabaseAdmin!
      .from('politicians')
      .update({ [field]: effectiveValue })
      .eq('id', suggestion.politician_id as string);

    if (error) console.error(`applySuggestEdit update failed for field ${field}:`, error);
  } else if (['party', 'title', 'constituency'].includes(field)) {
    // These live on the positions table – update current position
    const { error } = await supabaseAdmin!
      .from('positions')
      .update({ [field]: payload.proposed_value })
      .eq('politician_id', suggestion.politician_id as string)
      .eq('is_current', true);

    if (error) console.error(`applySuggestEdit position update failed for field ${field}:`, error);
  }
  // For 'other' or unrecognised fields, the admin can handle manually via DB.
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function applyAddOfficial(suggestion: Record<string, unknown>) {
  const p = suggestion.payload as Record<string, string | null>;
  if (!p?.full_name) return;

  const slug = generateSlug(p.full_name);

  // Create politician record
  const { data: politician, error: polErr } = await supabaseAdmin!
    .from('politicians')
    .insert({
      full_name: p.full_name,
      slug,
      state_of_origin: p.state ?? '',
      photo_url: (suggestion.image_url as string) || null,
      contact_phone: p.contact_phone ?? null,
      contact_email: p.contact_email ?? null,
      office_address: p.office_address ?? null,
      website_url: p.website_url ?? null,
      twitter_handle: p.twitter_handle ?? null,
      facebook_url: p.facebook_url ?? null,
      instagram_handle: p.instagram_handle ?? null,
      tiktok_handle: p.tiktok_handle ?? null,
      youtube_url: p.youtube_url ?? null,
      linkedin_url: p.linkedin_url ?? null,
    })
    .select('id')
    .single();

  if (polErr || !politician) {
    console.error('applyAddOfficial politician insert failed:', polErr);
    return;
  }

  // Create the position record
  const { error: posErr } = await supabaseAdmin!
    .from('positions')
    .insert({
      politician_id: politician.id,
      title: p.title ?? 'Unknown',
      chamber: p.chamber ?? null,
      office_level: p.office_level ?? 'federal',
      constituency: p.constituency ?? null,
      state: p.state ?? null,
      party: p.party ?? 'Unknown',
      start_date: p.start_date ?? new Date().toISOString().slice(0, 10),
      is_current: true,
    });

  if (posErr) {
    console.error('applyAddOfficial position insert failed:', posErr);
  }
}
