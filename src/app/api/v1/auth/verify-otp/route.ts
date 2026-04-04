import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { normalizePhone } from '@/lib/otp-utils';

/**
 * POST /api/v1/auth/verify-otp
 * Body: { phone: string, otp: string }
 *
 * Checks the OTP via Twilio Verify. Returns { verified: true, phone } on success.
 */
export async function POST(request: NextRequest) {
  let body: { phone?: string; otp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawPhone = body.phone?.trim();
  const rawOtp = body.otp?.trim();

  if (!rawPhone || !rawOtp) {
    return NextResponse.json({ error: 'phone and otp are required' }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

  try {
    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code: rawOtp });

    if (check.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Twilio Verify check error]', msg);

    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('does not exist')) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    if (msg.includes('429')) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait before trying again.' },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
  }

  return NextResponse.json({ verified: true, phone });
}
