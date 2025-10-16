-- Tenant User RLS Policies
CREATE POLICY "tenant_user_read_own_tenant" ON tenant_user FOR
SELECT
  USING (
    tenant_user.tenant_id = public.get_current_tenant_id ()
    AND tenant_user.is_active = true
  );

CREATE POLICY "tenant_user_insert_own_tenant" ON tenant_user FOR INSERT
WITH
  CHECK (
    tenant_user.tenant_id = public.get_current_tenant_id ()
  );

CREATE POLICY "tenant_user_update_own_tenant" ON tenant_user FOR
UPDATE USING (
  tenant_user.tenant_id = public.get_current_tenant_id ()
  AND tenant_user.is_active = true
);

CREATE POLICY "tenant_user_delete_own_tenant" ON tenant_user FOR DELETE USING (
  tenant_user.tenant_id = public.get_current_tenant_id ()
  AND tenant_user.is_active = true
);

COMMENT ON POLICY "tenant_user_read_own_tenant" ON tenant_user IS 'Users can view only users in their own tenant';