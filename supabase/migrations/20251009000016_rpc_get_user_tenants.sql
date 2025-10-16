-- RPC Function: get_user_tenants
-- Returns all tenants accessible to the current authenticated user
-- Used for: Tenant selection dropdown, context switching

CREATE OR REPLACE FUNCTION public.get_user_tenants()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name VARCHAR,
  tenant_slug VARCHAR,
  tenant_status TEXT,
  role_id UUID,
  role_code VARCHAR,
  role_name VARCHAR,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.status::TEXT AS tenant_status,
    r.id AS role_id,
    r.code AS role_code,
    r.name AS role_name,
    tu.is_active,
    tu.created_at AS joined_at
  FROM tenant_user tu
  INNER JOIN tenant t ON t.id = tu.tenant_id
  INNER JOIN role r ON r.id = tu.role_id
  WHERE tu.user_profile_id = (
    SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
  )
  AND tu.is_active = true
  ORDER BY tu.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_tenants() IS 'Returns all tenants accessible to the current user with role information';
