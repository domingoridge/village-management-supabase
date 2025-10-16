-- ============================================================================
-- RLS Policies for Gate Entry Log Table
-- ============================================================================
-- Ensures tenant isolation and role-based access control for gate entry logs
-- ============================================================================

-- Read: Users can view gate entry logs in their tenant
CREATE POLICY "gate_entry_log_read_by_tenant_member" ON gate_entry_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user
      WHERE tenant_user.tenant_id = gate_entry_log.tenant_id
      AND tenant_user.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tenant_user.is_active = true
    )
    OR public.is_superadmin()
  );

-- Insert: Security guards and admins can create gate entry logs
CREATE POLICY "gate_entry_log_insert_guard_admin" ON gate_entry_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = gate_entry_log.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers', 'security-head', 'security-officer')
    )
  );

-- Update: Security guards and admins can update logs (e.g., add exit time)
CREATE POLICY "gate_entry_log_update_guard_admin" ON gate_entry_log
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = gate_entry_log.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers', 'security-head', 'security-officer')
    )
  );

-- Delete: Only admin-head and superadmin can delete gate entry logs
CREATE POLICY "gate_entry_log_delete_admin" ON gate_entry_log
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = gate_entry_log.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head')
    )
  );

-- Add policy descriptions
COMMENT ON POLICY "gate_entry_log_read_by_tenant_member" ON gate_entry_log IS 'Users can view gate entry logs within their tenant';

COMMENT ON POLICY "gate_entry_log_insert_guard_admin" ON gate_entry_log IS 'Security guards and admins can create gate entry logs';

COMMENT ON POLICY "gate_entry_log_update_guard_admin" ON gate_entry_log IS 'Security guards and admins can update gate entry logs (e.g., record exit time)';

COMMENT ON POLICY "gate_entry_log_delete_admin" ON gate_entry_log IS 'Only admin-head and superadmin can delete gate entry logs';
