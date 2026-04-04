/**
 * Phone number utilities for OTP auth routes.
 *
 * The PhoneInput component always emits E.164 (e.g. "+2348012345678").
 * This normalizer is a safety net for any edge cases or direct API calls.
 */

/**
 * Normalize a raw phone input into E.164 format.
 *
 * Since the UI now provides a country-code dropdown, the value is
 * almost always already E.164.  These fallbacks handle direct API
 * callers or legacy clients:
 *
 * - Already has '+' prefix  → returned as-is
 * - Starts with 08x or 09x  → Nigerian mobile (+234)
 * - Bare 10-digit number     → Nigerian mobile (+234)
 * - Anything else            → '+' prepended
 */
export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  // 08x / 09x → unambiguously Nigerian mobile
  if (/^0[89]\d{8,9}$/.test(cleaned)) return `+234${cleaned.slice(1)}`;
  // Bare 10-digit number (no leading zero) → assume Nigerian
  if (/^\d{10}$/.test(cleaned)) return `+234${cleaned}`;
  // Fall-through: prepend '+' and trust the caller
  return `+${cleaned}`;
}

