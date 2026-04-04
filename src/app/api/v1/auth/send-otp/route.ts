import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { normalizePhone } from '@/lib/otp-utils';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/v1/auth/send-otp
 * Body: { phone: string }
 *
 * Sends a one-time code via Twilio Verify.
 */
export async function POST(request: NextRequest) {
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

  // Validate: E.164 — '+' then 1-9 then 9-14 more digits (no country code starts with 0)
  if (!/^\+[1-9]\d{9,14}$/.test(phone)) {
    return NextResponse.json(
      {
        error:
          'Invalid phone number. Include your country code (e.g. +447404938935 for UK, +2348012345678 for Nigeria).',
      },
      { status: 400 },
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    console.error('[send-otp] Missing Twilio env vars:', {
      TWILIO_ACCOUNT_SID: !!accountSid,
      TWILIO_AUTH_TOKEN: !!authToken,
      TWILIO_VERIFY_SERVICE_SID: !!serviceSid,
    });
    return NextResponse.json(
      { error: 'SMS service is not configured. Please contact support.' },
      { status: 503 },
    );
  }

  // Check for duplicate phone number before spending an SMS.
  // The RPC checks both user_profiles.phone_number (completed signups)
  // and auth.users.phone (Supabase stores phone without '+' prefix).
  if (supabaseAdmin) {
    const { data: alreadyRegistered, error: rpcError } = await supabaseAdmin
      .rpc('phone_already_registered', { phone_input: phone });

    if (rpcError) {
      console.error('[phone_already_registered RPC error]', rpcError.message);
    } else if (alreadyRegistered === true) {
      return NextResponse.json(
        { error: 'An account with this phone number already exists. Please sign in instead.' },
        { status: 409 },
      );
    }
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.verify.v2.services(serviceSid).verifications.create({
      to: phone,
      channel: 'sms',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: number })?.code;
    const status = (err as { status?: number })?.status;
    console.error('[Twilio Verify send error]', { msg, code, status, phone });

    if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 },
      );
    }

    // Surface the Twilio error so we can debug in production
    return NextResponse.json(
      { error: `SMS sending failed: ${msg}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: 'Verification code sent to your phone',
    phone,
  });
}
