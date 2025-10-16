-- RPC Function: check_user_permission
-- Checks if the current user has a specific permission in their current tenant context
-- Considers both role-based permissions and user-specific permission overrides

CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_permission_key VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_profile_id UUID;
  v_tenant_id UUID;
  v_has_permission BOOLEAN := false;
  v_role_permissions JSONB;
  v_user_permissions JSONB;
BEGIN
  -- Get current tenant from JWT claims
  v_tenant_id := public.get_current_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get current user profile
  SELECT id INTO v_user_profile_id
  FROM user_profile
  WHERE auth_user_id = auth.uid();

  IF v_user_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get user's role permissions and user-specific permission overrides
  SELECT
    r.permissions,
    tu.permissions
  INTO
    v_role_permissions,
    v_user_permissions
  FROM tenant_user tu
  INNER JOIN role r ON r.id = tu.role_id
  WHERE tu.user_profile_id = v_user_profile_id
  AND tu.tenant_id = v_tenant_id
  AND tu.is_active = true;

  IF v_role_permissions IS NULL THEN
    RETURN false;
  END IF;

  -- Check user-specific permission override first (takes precedence)
  IF v_user_permissions ? p_permission_key THEN
    v_has_permission := (v_user_permissions->>p_permission_key)::boolean;
    RETURN v_has_permission;
  END IF;

  -- Check role-based permission
  IF v_role_permissions ? p_permission_key THEN
    v_has_permission := (v_role_permissions->>p_permission_key)::boolean;
    RETURN v_has_permission;
  END IF;

  -- Permission not found in either role or user overrides
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_user_permission(VARCHAR) IS 'Checks if current user has a specific permission in current tenant context. User overrides take precedence over role permissions.';

-- Helper function to check multiple permissions at once
CREATE OR REPLACE FUNCTION public.check_user_permissions(
  p_permission_keys VARCHAR[]
)
RETURNS TABLE (
  permission_key VARCHAR,
  has_permission BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    key AS permission_key,
    public.check_user_permission(key) AS has_permission
  FROM unnest(p_permission_keys) AS key;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_user_permissions(VARCHAR[]) IS 'Batch check multiple permissions for current user in current tenant context.';

-- Function to get all permissions for current user
CREATE OR REPLACE FUNCTION public.get_current_user_permissions()
RETURNS JSONB AS $$
DECLARE
  v_user_profile_id UUID;
  v_tenant_id UUID;
  v_role_permissions JSONB;
  v_user_permissions JSONB;
  v_merged_permissions JSONB;
BEGIN
  -- Get current tenant from JWT claims
  v_tenant_id := public.get_current_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Get current user profile
  SELECT id INTO v_user_profile_id
  FROM user_profile
  WHERE auth_user_id = auth.uid();

  IF v_user_profile_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Get user's role permissions and user-specific permission overrides
  SELECT
    r.permissions,
    tu.permissions
  INTO
    v_role_permissions,
    v_user_permissions
  FROM tenant_user tu
  INNER JOIN role r ON r.id = tu.role_id
  WHERE tu.user_profile_id = v_user_profile_id
  AND tu.tenant_id = v_tenant_id
  AND tu.is_active = true;

  IF v_role_permissions IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Merge permissions (user overrides take precedence)
  v_merged_permissions := v_role_permissions;

  IF v_user_permissions IS NOT NULL THEN
    v_merged_permissions := v_role_permissions || v_user_permissions;
  END IF;

  RETURN v_merged_permissions;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_user_permissions() IS 'Returns all permissions for current user in current tenant context (merged role + user overrides).';
