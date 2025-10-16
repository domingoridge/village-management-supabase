-- RPC Function: assign_user_to_tenant
-- Assigns a user to a tenant with a specific role
-- Only callable by admin-head or higher in the target tenant

CREATE OR REPLACE FUNCTION public.assign_user_to_tenant(
  p_user_profile_id UUID,
  p_tenant_id UUID,
  p_role_id UUID,
  p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_user_profile_id UUID;
  v_current_user_role_code VARCHAR;
  v_target_role_code VARCHAR;
  v_existing_tenant_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user profile
  SELECT id INTO v_current_user_profile_id
  FROM user_profile
  WHERE auth_user_id = auth.uid();

  IF v_current_user_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Current user profile not found'
    );
  END IF;

  -- Check if current user has admin rights in target tenant
  SELECT r.code INTO v_current_user_role_code
  FROM tenant_user tu
  INNER JOIN role r ON r.id = tu.role_id
  WHERE tu.user_profile_id = v_current_user_profile_id
  AND tu.tenant_id = p_tenant_id
  AND tu.is_active = true
  AND r.code IN ('superadmin', 'admin-head');

  IF v_current_user_role_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions. Only admin-head or superadmin can assign users.'
    );
  END IF;

  -- Verify target role exists
  SELECT code INTO v_target_role_code
  FROM role
  WHERE id = p_role_id;

  IF v_target_role_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role_id provided'
    );
  END IF;

  -- Verify target user profile exists
  IF NOT EXISTS (SELECT 1 FROM user_profile WHERE id = p_user_profile_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user profile not found'
    );
  END IF;

  -- Check if user is already assigned to this tenant
  SELECT id INTO v_existing_tenant_user_id
  FROM tenant_user
  WHERE user_profile_id = p_user_profile_id
  AND tenant_id = p_tenant_id;

  IF v_existing_tenant_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already assigned to this tenant',
      'existing_tenant_user_id', v_existing_tenant_user_id
    );
  END IF;

  -- Insert new tenant_user record
  INSERT INTO tenant_user (
    tenant_id,
    user_profile_id,
    role_id,
    permissions,
    is_active
  ) VALUES (
    p_tenant_id,
    p_user_profile_id,
    p_role_id,
    p_permissions,
    true
  ) RETURNING id INTO v_existing_tenant_user_id;

  -- If this is the user's first tenant assignment, auto-set it in JWT
  -- This allows RLS policies to work immediately after first assignment
  IF NOT EXISTS (
    SELECT 1 FROM tenant_user
    WHERE user_profile_id = p_user_profile_id
    AND id != v_existing_tenant_user_id
  ) THEN
    -- This is the first tenant for this user, auto-set in JWT
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
        to_jsonb(p_role_id::text),
        true
      )
      WHERE id = (SELECT auth_user_id FROM user_profile WHERE id = p_user_profile_id);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'assign_user_to_tenant: failed to update auth.users.raw_app_meta_data: %', SQLERRM;
      -- Don't fail the entire operation if JWT update fails
    END;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'tenant_user_id', v_existing_tenant_user_id,
    'tenant_id', p_tenant_id,
    'user_profile_id', p_user_profile_id,
    'role_id', p_role_id,
    'role_code', v_target_role_code,
    'message', 'User successfully assigned to tenant'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.assign_user_to_tenant(UUID, UUID, UUID, JSONB) IS 'Assigns a user to a tenant with a specific role. Requires admin-head or superadmin permissions.';
