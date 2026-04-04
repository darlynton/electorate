/**
 * SMS utility for non-auth messages (notifications, alerts, etc.).
 *
 * OTP/verification SMS is handled by Supabase Auth (Twilio configured
 * in the Supabase dashboard). This module is for ad-hoc transactional
 * SMS only.
 *
 * Required env vars (only if you use sendSMS directly):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import twilio from 'twilio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmsResult {
  success: boolean;
  provider: 'twilio' | 'dev-console';
  messageId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Twilio client (lazy-initialized)
// ---------------------------------------------------------------------------

let _twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (_twilioClient) return _twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  _twilioClient = twilio(sid, token);
  return _twilioClient;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a transactional SMS via Twilio.
 * In development mode, logs to console instead of sending.
 */
export async function sendSMS(to: string, message: string): Promise<SmsResult> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV SMS] To: ${to} | Message: ${message}`);
    return { success: true, provider: 'dev-console' };
  }

  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !from) {
    return { success: false, provider: 'twilio', error: 'Twilio credentials not configured' };
  }

  try {
    const msg = await client.messages.create({ to, from, body: message });
    return { success: true, provider: 'twilio', messageId: msg.sid };
  } catch (err) {
    return {
      success: false,
      provider: 'twilio',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
