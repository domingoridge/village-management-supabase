-- Tenant RLS Policies

-- Read: User must belong to tenant via tenant_user
CREATE POLICY "tenant_read_by_member" ON tenant
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user
      WHERE tenant_user.tenant_id = tenant.id
      AND tenant_user.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tenant_user.is_active = true
    )
    OR public.is_superadmin()
  );

-- Insert: Superadmin only
CREATE POLICY "tenant_insert_superadmin" ON tenant
  FOR INSERT
  WITH CHECK (public.is_superadmin());

-- Update: Admin-head or superadmin for their own tenant
CREATE POLICY "tenant_update_admin" ON tenant
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      WHERE tu.tenant_id = tenant.id
      AND tu.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head')
    )
  );

-- Delete: Superadmin only (soft delete via status)
CREATE POLICY "tenant_delete_superadmin" ON tenant
  FOR DELETE
  USING (public.is_superadmin());

COMMENT ON POLICY "tenant_read_by_member" ON tenant IS 'Users can view tenants they belong to';
