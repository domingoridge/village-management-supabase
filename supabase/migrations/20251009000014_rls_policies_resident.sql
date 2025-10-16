-- Resident RLS Policies

-- Read: Residents can view other residents in their household
CREATE POLICY "resident_read_own_household" ON resident
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household h
      WHERE h.id = resident.household_id
      AND h.tenant_id = public.get_current_tenant_id()
    )
  );

-- Insert: Household-head for their household, admin-head/admin-officers for any
CREATE POLICY "resident_insert_admin_or_head" ON resident
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household h
      WHERE h.id = resident.household_id
      AND h.tenant_id = public.get_current_tenant_id()
    ) AND
    (
      -- Admins can add to any household
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
      -- OR household-head can add to their household
      OR EXISTS (
        SELECT 1 FROM resident res
        JOIN tenant_user tu ON tu.id = res.tenant_user_id
        JOIN role r ON r.id = tu.role_id
        WHERE res.household_id = resident.household_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
      )
    )
  );

-- Update: Household-head can update permissions
CREATE POLICY "resident_update_head" ON resident
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household h
      WHERE h.id = resident.household_id
      AND h.tenant_id = public.get_current_tenant_id()
    ) AND
    (
      -- Admins can update any member
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
      -- OR household-head can update members in their household
      OR EXISTS (
        SELECT 1 FROM resident res
        JOIN tenant_user tu ON tu.id = res.tenant_user_id
        JOIN role r ON r.id = tu.role_id
        WHERE res.household_id = resident.household_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
      )
    )
  );

-- Delete: Household-head can remove members, admin-head can remove anyone
CREATE POLICY "resident_delete_admin_or_head" ON resident
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household h
      WHERE h.id = resident.household_id
      AND h.tenant_id = public.get_current_tenant_id()
    ) AND
    (
      EXISTS (
        SELECT 1 FROM tenant_user tu
        JOIN role r ON r.id = tu.role_id
        WHERE tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.tenant_id = public.get_current_tenant_id()
        AND tu.is_active = true
        AND r.code IN ('superadmin', 'admin-head', 'admin-officers', 'household-head')
      )
    )
  );

COMMENT ON POLICY "resident_read_own_household" ON resident IS 'Residents can view other residents in their household';
