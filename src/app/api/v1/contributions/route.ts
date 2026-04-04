import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// ── Validation schemas ────────────────────────────────────────────────────────
const suggestEditSchema = z.object({
  submission_type: z.literal('suggest_edit'),
  politician_id: z.string().uuid(),
  field_name: z.string().trim().min(2).max(64),
  current_value: z.string().trim().max(500).optional(),
  proposed_value: z.string().trim().min(1).max(2000),
  reason: z.string().trim().min(3).max(4000),
  source_url: z.string().trim().url().optional(),
  submitter_name: z.string().trim().max(80).optional(),
  submitter_email: z.string().trim().email().optional(),
});

const addOfficialSchema = z.object({
  submission_type: z.literal('add_official'),
  full_name: z.string().trim().min(3).max(120),
  title: z.string().trim().min(2).max(120),
  chamber: z.enum(['Executive', 'Senate', 'House', 'State Assembly']),
  office_level: z.enum(['federal', 'state', 'local']),
  state: z.string().trim().min(2).max(50),
  constituency: z.string().trim().max(120).optional(),
  party: z.string().trim().min(2).max(30),
  start_date: z.string().trim().optional(),
  source_url: z.string().trim().url(),
  notes: z.string().trim().max(4000).optional(),
  // Contact & social fields
  contact_phone: z.string().trim().max(30).optional(),
  contact_email: z.string().trim().email().optional(),
  office_address: z.string().trim().max(300).optional(),
  website_url: z.string().trim().url().optional(),
  twitter_handle: z.string().trim().max(60).optional(),
  facebook_url: z.string().trim().url().optional(),
  instagram_handle: z.string().trim().max(60).optional(),
  tiktok_handle: z.string().trim().max(60).optional(),
  youtube_url: z.string().trim().url().optional(),
  linkedin_url: z.string().trim().url().optional(),
  submitter_name: z.string().trim().max(80).optional(),
  submitter_email: z.string().trim().email().optional(),
});

function getString(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

async function uploadOptimizedImage(file: File, folder: string): Promise<string> {
  if (!supabaseAdmin) throw new Error('Supabase admin client unavailable');

  const input = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(input)
    .rotate()
    .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toBuffer();

  const random = Math.random().toString(36).slice(2, 10);
  const filePath = `${folder}/${Date.now()}-${random}.webp`;

  const { error } = await supabaseAdmin.storage
    .from('politician-photos')
    .upload(filePath, optimized, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });

  if (error) throw new Error(error.message);

  return supabaseAdmin.storage.from('politician-photos').getPublicUrl(filePath).data.publicUrl;
}

// ── POST /api/v1/contributions ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured for submissions' }, { status: 500 });
    }

    // Auth
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

    const fd = await request.formData();
    const submissionType = getString(fd, 'submission_type');

    // Optional image upload
    const imageFile = fd.get('photo');
    let imageUrl: string | undefined;
    if (imageFile instanceof File && imageFile.size > 0) {
      const supported = ['image/jpeg', 'image/png', 'image/webp'];
      if (!supported.includes(imageFile.type)) {
        return NextResponse.json({ error: 'Photo must be JPEG, PNG, or WebP' }, { status: 400 });
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Photo must be 5 MB or smaller' }, { status: 400 });
      }
      imageUrl = await uploadOptimizedImage(imageFile, `submissions/${submissionType ?? 'general'}`);
    }

    // ── Suggest Edit ──────────────────────────────────────────────────────────
    if (submissionType === 'suggest_edit') {
      const parsed = suggestEditSchema.safeParse({
        submission_type: 'suggest_edit',
        politician_id: getString(fd, 'politician_id'),
        field_name: getString(fd, 'field_name'),
        current_value: getString(fd, 'current_value'),
        proposed_value: getString(fd, 'proposed_value'),
        reason: getString(fd, 'reason'),
        source_url: getString(fd, 'source_url'),
        submitter_name: getString(fd, 'submitter_name'),
        submitter_email: getString(fd, 'submitter_email'),
      });

      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid submission', details: parsed.error.flatten() }, { status: 400 });
      }

      const v = parsed.data;
      const { data, error } = await supabaseAdmin
        .from('edit_suggestions')
        .insert({
          politician_id: v.politician_id,
          submission_type: 'suggest_edit',
          payload: {
            field_name: v.field_name,
            current_value: v.current_value ?? null,
            proposed_value: v.proposed_value,
          },
          reason: v.reason,
          source_url: v.source_url ?? null,
          image_url: imageUrl ?? null,
          submitted_by: userId,
          submitter_name: v.submitter_name ?? null,
          submitter_email: v.submitter_email ?? null,
          status: 'pending',
        })
        .select('id, status, created_at')
        .single();

      if (error) {
        console.error('suggest_edit insert failed:', error);
        return NextResponse.json({ error: 'Failed to save suggestion' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    // ── Add Official ──────────────────────────────────────────────────────────
    if (submissionType === 'add_official') {
      const raw: Record<string, string | undefined> = {};
      for (const key of [
        'full_name', 'title', 'chamber', 'office_level', 'state', 'constituency',
        'party', 'start_date', 'source_url', 'notes',
        'contact_phone', 'contact_email', 'office_address',
        'website_url', 'twitter_handle', 'facebook_url',
        'instagram_handle', 'tiktok_handle', 'youtube_url', 'linkedin_url',
        'submitter_name', 'submitter_email',
      ]) {
        raw[key] = getString(fd, key);
      }
      raw.submission_type = 'add_official';

      const parsed = addOfficialSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid submission', details: parsed.error.flatten() }, { status: 400 });
      }

      const v = parsed.data;
      const payload = {
        full_name: v.full_name,
        title: v.title,
        chamber: v.chamber,
        office_level: v.office_level,
        state: v.state,
        constituency: v.constituency ?? null,
        party: v.party,
        start_date: v.start_date ?? null,
        notes: v.notes ?? null,
        contact_phone: v.contact_phone ?? null,
        contact_email: v.contact_email ?? null,
        office_address: v.office_address ?? null,
        website_url: v.website_url ?? null,
        twitter_handle: v.twitter_handle ?? null,
        facebook_url: v.facebook_url ?? null,
        instagram_handle: v.instagram_handle ?? null,
        tiktok_handle: v.tiktok_handle ?? null,
        youtube_url: v.youtube_url ?? null,
        linkedin_url: v.linkedin_url ?? null,
      };

      const { data, error } = await supabaseAdmin
        .from('edit_suggestions')
        .insert({
          politician_id: null,
          submission_type: 'add_official',
          payload,
          reason: v.notes ?? null,
          source_url: v.source_url,
          image_url: imageUrl ?? null,
          submitted_by: userId,
          submitter_name: v.submitter_name ?? null,
          submitter_email: v.submitter_email ?? null,
          status: 'pending',
        })
        .select('id, status, created_at')
        .single();

      if (error) {
        console.error('add_official insert failed:', error);
        return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported submission_type' }, { status: 400 });
  } catch (error) {
    console.error('Contribution submission failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
