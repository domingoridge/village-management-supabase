-- Function: get_current_user_profile_id()
-- Returns the user_profile.id for the currently authenticated user
-- SECURITY DEFINER to avoid invoking RLS on user_profile when used inside policies

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID AS $$
DECLARE
  result_uuid UUID;
  v_claims JSONB;
BEGIN
  -- Prefer returning the user_profile_id embedded in the JWT app_metadata to avoid
  -- selecting from the user_profile table while row-level-security policies are
  -- being evaluated (which can cause infinite recursion).
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN others THEN
    v_claims := NULL;
  END;

  IF v_claims IS NOT NULL THEN
    -- app_metadata may store a user_profile_id (set by the backend after sign-in)
    IF (v_claims -> 'app_metadata' ->> 'user_profile_id') IS NOT NULL THEN
      result_uuid := (v_claims -> 'app_metadata' ->> 'user_profile_id')::uuid;
      RETURN result_uuid;
    END IF;
  END IF;

  -- If the JWT does not contain the user_profile_id claim, return NULL.
  -- Avoid querying public.user_profile here to prevent invoking RLS on that table
  -- while policies that call this function are executing (which can produce
  -- infinite recursion). Systems that need a fallback should populate the
  -- JWT `app_metadata.user_profile_id` at authentication time.
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_user_profile_id() IS 'Return current authenticated user''s user_profile.id from JWT app_metadata.user_profile_id when available (avoids RLS recursion)';
