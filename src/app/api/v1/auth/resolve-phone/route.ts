import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/otp-utils';

/**
 * POST /api/v1/auth/resolve-phone
 * Body: { phone: string }
 *
 * Looks up the email address associated with a phone number so the
 * user can log in with phone + password. Returns { email } on success.
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body.phone?.trim();
  if (!raw) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }

  const phone = normalizePhone(raw);

  // Look up the email via RPC — checks user_profiles first, then
  // falls back to auth.users user_metadata for older accounts.
  const { data: rows, error } = await supabaseAdmin
    .rpc('resolve_phone_to_email', { phone_input: phone });

  const email = rows?.[0]?.email as string | undefined;

  if (error || !email) {
    return NextResponse.json(
      { error: 'No account found with this phone number' },
      { status: 404 },
    );
  }
  const [localPart, domain] = email.split('@');
  const masked =
    localPart.length <= 2
      ? `${localPart}***@${domain}`
      : `${localPart.slice(0, 2)}***@${domain}`;

  return NextResponse.json({ email: masked, _email: email });
}
