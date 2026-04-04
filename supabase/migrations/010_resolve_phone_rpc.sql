-- Migration 010: Backfill phone_number in user_profiles from auth metadata
--               + RPC to resolve phone → email for login

-- Backfill any user_profiles rows missing phone_number where the
-- auth.users record has a phone in user_metadata
UPDATE public.user_profiles
SET phone_number = up.meta_phone
FROM (
  SELECT id, raw_user_meta_data->>'phone' AS meta_phone
  FROM auth.users
  WHERE raw_user_meta_data->>'phone' IS NOT NULL
    AND raw_user_meta_data->>'phone' <> ''
) AS up
WHERE user_profiles.id = up.id
  AND (user_profiles.phone_number IS NULL OR user_profiles.phone_number = '');

-- RPC: resolve a phone number to the linked email address.
-- Checks user_profiles first (canonical), then falls back to auth.users
-- user_metadata for accounts created before the profile trigger was added.
CREATE OR REPLACE FUNCTION public.resolve_phone_to_email(phone_input TEXT)
RETURNS TABLE(email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_stripped TEXT;
BEGIN
  phone_stripped := REGEXP_REPLACE(phone_input, '^\+', '');

  -- 1. Try user_profiles (canonical store)
  RETURN QUERY
    SELECT up.email::TEXT
    FROM public.user_profiles up
    WHERE up.phone_number = phone_input
      AND up.email IS NOT NULL
      AND up.email <> ''
    LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- 2. Fall back to auth.users user_metadata / phone field
  RETURN QUERY
    SELECT au.email::TEXT
    FROM auth.users au
    WHERE (
      au.raw_user_meta_data->>'phone' = phone_input
      OR au.phone = phone_stripped
    )
    AND au.email IS NOT NULL
    AND au.email <> ''
    AND au.email NOT LIKE '%@dev.naijrep.local'
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_phone_to_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_phone_to_email(TEXT) TO service_role;
