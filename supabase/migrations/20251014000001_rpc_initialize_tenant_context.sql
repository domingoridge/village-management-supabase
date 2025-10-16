-- RPC Function: initialize_tenant_context
-- Automatically sets tenant context after login
-- If user has exactly 1 tenant -> auto-switches to it
-- If user has 0 or multiple tenants -> returns list for UI to handle
-- If user already has tenant context -> returns current context

CREATE OR REPLACE FUNCTION public.initialize_tenant_context()
RETURNS JSONB AS $$
DECLARE
  v_user_profile_id UUID;
  v_current_tenant_id UUID;
  v_tenant_count INTEGER;
  v_single_tenant_record RECORD;
  v_tenants JSONB;
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

  -- Check if user already has tenant_id in JWT
  -- Note: This reads from auth.users.raw_app_meta_data, not from JWT claims
  SELECT raw_app_meta_data->>'tenant_id' INTO v_current_tenant_id
  FROM auth.users
  WHERE id = auth.uid();

  -- Get all accessible tenants for this user
  SELECT jsonb_agg(
    jsonb_build_object(
      'tenant_id', tu.tenant_id,
      'tenant_name', t.name,
      'tenant_status', t.status,
      'role_id', tu.role_id,
      'role_code', r.code,
      'role_name', r.name,
      'is_active', tu.is_active
    )
  ), COUNT(*)
  INTO v_tenants, v_tenant_count
  FROM tenant_user tu
  INNER JOIN tenant t ON t.id = tu.tenant_id
  INNER JOIN role r ON r.id = tu.role_id
  WHERE tu.user_profile_id = v_user_profile_id
  AND tu.is_active = true
  AND t.status = 'active';

  -- Handle case: User already has tenant context set
  IF v_current_tenant_id IS NOT NULL THEN
    -- Verify the current tenant is still valid
    IF EXISTS (
      SELECT 1 FROM tenant_user tu
      INNER JOIN tenant t ON t.id = tu.tenant_id
      WHERE tu.tenant_id = v_current_tenant_id::uuid
      AND tu.user_profile_id = v_user_profile_id
      AND tu.is_active = true
      AND t.status = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'auto_switched', false,
        'has_context', true,
        'current_tenant_id', v_current_tenant_id,
        'tenants', COALESCE(v_tenants, '[]'::jsonb),
        'message', 'Tenant context already set'
      );
    ELSE
      -- Current tenant is invalid, clear it
      UPDATE auth.users
      SET raw_app_meta_data = (
        coalesce(raw_app_meta_data, '{}'::jsonb) - 'tenant_id' - 'role_id'
      )
      WHERE id = auth.uid();

      v_current_tenant_id := NULL;
    END IF;
  END IF;

  -- Handle case: User has no accessible tenants
  IF v_tenant_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'auto_switched', false,
      'has_context', false,
      'tenants', '[]'::jsonb,
      'message', 'User has no accessible tenants'
    );
  END IF;

  -- Handle case: User has exactly 1 tenant - auto-switch
  IF v_tenant_count = 1 THEN
    -- Get the single tenant details
    SELECT
      tu.tenant_id,
      tu.role_id,
      r.code AS role_code
    INTO v_single_tenant_record
    FROM tenant_user tu
    INNER JOIN tenant t ON t.id = tu.tenant_id
    INNER JOIN role r ON r.id = tu.role_id
    WHERE tu.user_profile_id = v_user_profile_id
    AND tu.is_active = true
    AND t.status = 'active'
    LIMIT 1;

    -- Set tenant context in JWT
    BEGIN
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(
        jsonb_set(
          coalesce(raw_app_meta_data, '{}'::jsonb),
          '{tenant_id}',
          to_jsonb(v_single_tenant_record.tenant_id::text),
          true
        ),
        '{role_id}',
        to_jsonb(v_single_tenant_record.role_id::text),
        true
      )
      WHERE id = auth.uid();
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'initialize_tenant_context: failed to update auth.users.raw_app_meta_data: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to set tenant context in JWT',
        'details', SQLERRM
      );
    END;

    RETURN jsonb_build_object(
      'success', true,
      'auto_switched', true,
      'has_context', true,
      'current_tenant_id', v_single_tenant_record.tenant_id,
      'role_id', v_single_tenant_record.role_id,
      'role_code', v_single_tenant_record.role_code,
      'tenants', v_tenants,
      'requires_token_refresh', true,
      'message', 'Automatically switched to your only accessible tenant'
    );
  END IF;

  -- Handle case: User has multiple tenants - return list for UI
  RETURN jsonb_build_object(
    'success', true,
    'auto_switched', false,
    'has_context', false,
    'tenants', v_tenants,
    'message', 'Multiple tenants available. Please select one.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.initialize_tenant_context() IS 'Automatically initializes tenant context after login. Auto-switches if user has exactly 1 tenant, otherwise returns tenant list for selection.';
