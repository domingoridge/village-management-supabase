-- ============================================================================
-- RLS Policies for Permit Table
-- ============================================================================
-- Ensures tenant isolation and role-based access control for permits
-- ============================================================================

-- Read: Users can view permits in their tenant
CREATE POLICY "permit_read_by_tenant_member" ON permit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user
      WHERE tenant_user.tenant_id = permit.tenant_id
      AND tenant_user.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tenant_user.is_active = true
    )
    OR public.is_superadmin()
  );

-- Insert: Residents can create permits for their household
CREATE POLICY "permit_insert_by_resident" ON permit
  FOR INSERT
  WITH CHECK (
    -- Must be a resident of the household
    EXISTS (
      SELECT 1 FROM resident res
      JOIN tenant_user tu ON tu.id = res.tenant_user_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE res.household_id = permit.household_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
    )
    -- Tenant context must match
    AND tenant_id = (
      SELECT tu.tenant_id FROM tenant_user tu
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE up.auth_user_id = auth.uid()
      AND tu.is_active = true
      LIMIT 1
    )
  );

-- Update: Permit requester or admins can update their permits
CREATE POLICY "permit_update_by_requester_or_admin" ON permit
  FOR UPDATE
  USING (
    -- Permit requester can update (before approval)
    (
      requested_by IN (
        SELECT tu.id FROM tenant_user tu
        JOIN user_profile up ON up.id = tu.user_profile_id
        WHERE up.auth_user_id = auth.uid()
        AND tu.is_active = true
      )
      AND status IN ('draft', 'submitted')
    )
    -- OR admin/superadmin can update
    OR EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = permit.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
    )
  );

-- Delete: Only admins can delete permits
CREATE POLICY "permit_delete_admin" ON permit
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = permit.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head')
    )
  );

-- Add policy descriptions
COMMENT ON POLICY "permit_read_by_tenant_member" ON permit IS 'Users can view permits within their tenant';

COMMENT ON POLICY "permit_insert_by_resident" ON permit IS 'Residents can create permits for their household';

COMMENT ON POLICY "permit_update_by_requester_or_admin" ON permit IS 'Permit requesters can update drafts/submitted permits; admins can update any permit';

COMMENT ON POLICY "permit_delete_admin" ON permit IS 'Only admin-head and superadmin can delete permits';
