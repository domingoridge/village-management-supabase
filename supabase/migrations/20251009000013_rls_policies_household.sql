-- Household RLS Policies

-- Read: All tenant users can view households in their tenant
CREATE POLICY "household_read_tenant" ON household
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- Insert: Admin-head and admin-officers only
CREATE POLICY "household_insert_admin" ON household
  FOR INSERT
  WITH CHECK (
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

-- Update: Admin-head, admin-officers, household-head (own household only)
CREATE POLICY "household_update_admin_or_head" ON household
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can update any household
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
      -- OR household-head can update their own household
      OR EXISTS (
        SELECT 1 FROM resident res
        JOIN tenant_user tu ON tu.id = res.tenant_user_id
        JOIN role r ON r.id = tu.role_id
        WHERE res.household_id = household.id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
      )
    )
  );

-- Delete: Admin-head only (soft delete via status)
CREATE POLICY "household_delete_admin" ON household
  FOR DELETE
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
      AND r.code IN ('superadmin', 'admin-head')
    )
  );

COMMENT ON POLICY "household_read_tenant" ON household IS 'All tenant users can view households in their tenant';
