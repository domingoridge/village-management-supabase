-- RPC Function: switch_tenant_context
-- Validates user access to tenant and returns tenant context information
-- Client should manage tenant context in application state/session
-- Returns success/failure status with tenant details

CREATE OR REPLACE FUNCTION public.switch_tenant_context(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_profile_id UUID;
  v_tenant_user_record RECORD;
  v_result JSONB;
BEGIN
  -- Get current user profile
  SELECT id INTO v_user_profile_id
  FROM user_profile
  WHERE auth_user_id = auth.uid();

  IF v_user_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;

  -- Verify user has access to target tenant
  SELECT
    tu.id,
    tu.role_id,
    tu.is_active,
    t.status,
    r.code AS role_code
  INTO v_tenant_user_record
  FROM tenant_user tu
  INNER JOIN tenant t ON t.id = tu.tenant_id
  INNER JOIN role r ON r.id = tu.role_id
  WHERE tu.tenant_id = p_tenant_id
  AND tu.user_profile_id = v_user_profile_id;

  IF v_tenant_user_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not have access to this tenant'
    );
  END IF;

  IF NOT v_tenant_user_record.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User account is inactive in this tenant'
    );
  END IF;

  IF v_tenant_user_record.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant is not active',
      'tenant_status', v_tenant_user_record.status
    );
  END IF;

  -- Update auth.users.raw_app_meta_data with tenant_id and role_id
  -- This allows get_current_tenant_id() and get_current_role_id() to work in RLS policies
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb),
        '{tenant_id}',
        to_jsonb(p_tenant_id::text),
        true
      ),
      '{role_id}',
      to_jsonb(v_tenant_user_record.role_id::text),
      true
    )
    WHERE id = auth.uid();
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'switch_tenant_context: failed to update auth.users.raw_app_meta_data: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update tenant context in JWT',
      'details', SQLERRM
    );
  END;

  -- Return tenant context information
  -- Note: Client MUST refresh their JWT token to get the updated app_metadata
  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'tenant_user_id', v_tenant_user_record.id,
    'role_id', v_tenant_user_record.role_id,
    'role_code', v_tenant_user_record.role_code,
    'message', 'Tenant context switched successfully. Please refresh your JWT token.',
    'requires_token_refresh', true
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.switch_tenant_context(UUID) IS 'Validates user access to tenant, updates JWT app_metadata with tenant_id and role_id, and returns tenant context. Client must refresh JWT token after calling this function.';

-- RPC Function: clear_tenant_context
-- Removes tenant_id and role_id from JWT app_metadata
-- Useful when user wants to switch out of tenant context or log out

CREATE OR REPLACE FUNCTION public.clear_tenant_context()
RETURNS JSONB AS $$
BEGIN
  -- Remove tenant_id and role_id from auth.users.raw_app_meta_data
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = (
      coalesce(raw_app_meta_data, '{}'::jsonb) - 'tenant_id' - 'role_id'
    )
    WHERE id = auth.uid();
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'clear_tenant_context: failed to update auth.users.raw_app_meta_data: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to clear tenant context from JWT',
      'details', SQLERRM
    );
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant context cleared successfully. Please refresh your JWT token.',
    'requires_token_refresh', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.clear_tenant_context() IS 'Removes tenant_id and role_id from JWT app_metadata. Client must refresh JWT token after calling this function.';
