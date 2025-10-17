-- RPC Function: search_user_profile_by_name
-- Searches user profiles by first name or last name (case-insensitive, partial match)
-- Filters results by tenant_id to maintain multi-tenant isolation
-- Returns user profile details along with email, phone, and tenant role information
-- Used for: User search, admin panels, user lookup features within a specific tenant

CREATE OR REPLACE FUNCTION public.search_user_profile_by_name(
  p_tenant_id UUID,
  p_search_term TEXT
)
RETURNS TABLE (
  id UUID,
  auth_user_id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  avatar_url TEXT,
  preferences JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  phone TEXT,
  tenant_user_id UUID,
  role_id UUID,
  role_code VARCHAR,
  role_name VARCHAR,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Validate inputs
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID cannot be null';
  END IF;

  IF p_search_term IS NULL OR trim(p_search_term) = '' THEN
    RAISE EXCEPTION 'Search term cannot be empty';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.auth_user_id,
    up.first_name,
    up.last_name,
    up.avatar_url,
    up.preferences,
    up.created_at,
    up.updated_at,
    au.email::TEXT,
    au.phone::TEXT,
    tu.id AS tenant_user_id,
    r.id AS role_id,
    r.code AS role_code,
    r.name AS role_name,
    tu.is_active
  FROM user_profile up
  INNER JOIN auth.users au ON au.id = up.auth_user_id
  INNER JOIN tenant_user tu ON tu.user_profile_id = up.id
  INNER JOIN role r ON r.id = tu.role_id
  WHERE
    tu.tenant_id = p_tenant_id
    AND tu.is_active = true
    AND (
      up.first_name ILIKE '%' || p_search_term || '%'
      OR up.last_name ILIKE '%' || p_search_term || '%'
    )
  ORDER BY up.last_name, up.first_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.search_user_profile_by_name(UUID, TEXT) IS 'Searches user profiles by first or last name within a specific tenant (case-insensitive) and returns profile details with email, phone, and role information';

-- Note: Consider adding GIN indexes on first_name and last_name if search performance becomes an issue:
-- CREATE INDEX idx_user_profile_first_name_gin ON user_profile USING gin (first_name gin_trgm_ops);
-- CREATE INDEX idx_user_profile_last_name_gin ON user_profile USING gin (last_name gin_trgm_ops);
-- (Requires pg_trgm extension)
