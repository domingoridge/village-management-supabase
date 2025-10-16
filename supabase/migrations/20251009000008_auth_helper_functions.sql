-- Helper function to extract current tenant_id from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to extract current role_id from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_role_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role_id')::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_user tu
    JOIN role r ON r.id = tu.role_id
    WHERE tu.user_profile_id = (
      SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
    )
    AND r.code = 'superadmin'
    AND tu.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_current_tenant_id IS 'Extract tenant_id from JWT app_metadata';
COMMENT ON FUNCTION public.get_current_role_id IS 'Extract role_id from JWT app_metadata';
COMMENT ON FUNCTION public.is_superadmin IS 'Check if current user has superadmin role';
