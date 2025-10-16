-- Residential Community Config RLS Policies

-- Read: All tenant users can view config
CREATE POLICY "residential_config_read_tenant" ON residential_community_config
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- Update: Admin-head and admin-officers only
CREATE POLICY "residential_config_update_admin" ON residential_community_config
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      WHERE tu.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tu.tenant_id = public.get_current_tenant_id()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
    )
  );

-- Insert: Auto-created by trigger (service role only)
CREATE POLICY "residential_config_insert_service" ON residential_community_config
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Delete: Cascade from tenant (service role only)
CREATE POLICY "residential_config_delete_service" ON residential_community_config
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON POLICY "residential_config_read_tenant" ON residential_community_config IS 'All tenant users can view config';
