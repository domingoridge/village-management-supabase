-- RPC Function: validate_current_session
-- Validates the current user's session and tenant context
-- Returns comprehensive session information for debugging and verification

CREATE OR REPLACE FUNCTION public.validate_current_session()
RETURNS JSONB AS $$
DECLARE
  v_auth_user_id UUID;
  v_user_profile_id UUID;
  v_tenant_id UUID;
  v_role_id UUID;
  v_tenant_user_record RECORD;
  v_role_record RECORD;
  v_tenant_record RECORD;
  v_result JSONB;
BEGIN
  -- Get auth user ID
  v_auth_user_id := auth.uid();

  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'No authenticated user',
      'code', 'NO_AUTH'
    );
  END IF;

  -- Get user profile
  SELECT id INTO v_user_profile_id
  FROM user_profile
  WHERE auth_user_id = v_auth_user_id;

  IF v_user_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'User profile not found',
      'code', 'NO_PROFILE',
      'auth_user_id', v_auth_user_id
    );
  END IF;

  -- Get tenant ID from JWT claims
  v_tenant_id := public.get_current_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'No tenant context set in JWT',
      'code', 'NO_TENANT_CONTEXT',
      'auth_user_id', v_auth_user_id,
      'user_profile_id', v_user_profile_id,
      'hint', 'Call switch_tenant_context to set tenant'
    );
  END IF;

  -- Verify tenant exists and is active
  SELECT
    id,
    name,
    slug,
    status
  INTO v_tenant_record
  FROM tenant
  WHERE id = v_tenant_id;

  IF v_tenant_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Tenant not found',
      'code', 'TENANT_NOT_FOUND',
      'tenant_id', v_tenant_id
    );
  END IF;

  IF v_tenant_record.status != 'active' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Tenant is not active',
      'code', 'TENANT_INACTIVE',
      'tenant_id', v_tenant_id,
      'tenant_status', v_tenant_record.status
    );
  END IF;

  -- Get tenant_user record
  SELECT
    tu.id,
    tu.role_id,
    tu.is_active,
    tu.permissions,
    tu.created_at
  INTO v_tenant_user_record
  FROM tenant_user tu
  WHERE tu.user_profile_id = v_user_profile_id
  AND tu.tenant_id = v_tenant_id;

  IF v_tenant_user_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'User is not assigned to this tenant',
      'code', 'USER_NOT_IN_TENANT',
      'user_profile_id', v_user_profile_id,
      'tenant_id', v_tenant_id
    );
  END IF;

  IF NOT v_tenant_user_record.is_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'User account is inactive in this tenant',
      'code', 'USER_INACTIVE',
      'tenant_user_id', v_tenant_user_record.id
    );
  END IF;

  -- Get role information
  SELECT
    id,
    code,
    name,
    scope,
    hierarchy_level,
    permissions
  INTO v_role_record
  FROM role
  WHERE id = v_tenant_user_record.role_id;

  IF v_role_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Role not found',
      'code', 'ROLE_NOT_FOUND',
      'role_id', v_tenant_user_record.role_id
    );
  END IF;

  -- Build success response with full context
  v_result := jsonb_build_object(
    'valid', true,
    'session', jsonb_build_object(
      'auth_user_id', v_auth_user_id,
      'user_profile_id', v_user_profile_id,
      'tenant_user_id', v_tenant_user_record.id
    ),
    'tenant', jsonb_build_object(
      'id', v_tenant_record.id,
      'name', v_tenant_record.name,
      'slug', v_tenant_record.slug,
      'status', v_tenant_record.status
    ),
    'role', jsonb_build_object(
      'id', v_role_record.id,
      'code', v_role_record.code,
      'name', v_role_record.name,
      'scope', v_role_record.scope,
      'hierarchy_level', v_role_record.hierarchy_level
    ),
    'permissions', jsonb_build_object(
      'role_permissions', v_role_record.permissions,
      'user_overrides', v_tenant_user_record.permissions
    ),
    'joined_at', v_tenant_user_record.created_at
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_current_session() IS 'Validates current user session and returns comprehensive tenant context information. Useful for debugging and session verification.';
