-- Migration 009: RPC to check if a phone number is already registered
--
-- Checks both:
--   1. public.user_profiles.phone_number  (completed signups)
--   2. auth.users.phone                   (Supabase stores without leading '+')
--      Only counts rows with a real email, ignoring ghost accounts from
--      Supabase Auth phone-OTP dev attempts (e.g. *@dev.naijrep.local).

CREATE OR REPLACE FUNCTION public.phone_already_registered(phone_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as the function owner (postgres), so it can
SET search_path = public  -- read auth.users safely
AS $$
DECLARE
  phone_stripped TEXT;
  profile_count  INT;
  auth_count     INT;
BEGIN
  -- auth.users stores phone without the leading '+', e.g. 447404938935
  phone_stripped := REGEXP_REPLACE(phone_input, '^\+', '');

  -- 1. Check completed profiles
  SELECT COUNT(*)
    INTO profile_count
    FROM public.user_profiles
   WHERE phone_number = phone_input;

  IF profile_count > 0 THEN
    RETURN TRUE;
  END IF;

  -- 2. Check auth.users: block any entry where this phone was confirmed
  --    (phone stored without '+' in Supabase; phone_confirmed_at IS NOT NULL
  --    means the number was verified at some point, regardless of email format)
  SELECT COUNT(*)
    INTO auth_count
    FROM auth.users
   WHERE phone = phone_stripped
     AND phone_confirmed_at IS NOT NULL;

  RETURN auth_count > 0;
END;
$$;

-- Only the service role (server-side API routes) should call this.
REVOKE ALL ON FUNCTION public.phone_already_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_already_registered(TEXT) TO service_role;
