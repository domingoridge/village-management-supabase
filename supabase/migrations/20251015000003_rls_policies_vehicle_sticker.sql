-- Vehicle Sticker RLS Policies

-- Read: All tenant users can view vehicle stickers in their tenant
CREATE POLICY "vehicle_sticker_read_tenant" ON vehicle_sticker
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- Insert: Admin users can create vehicle stickers
CREATE POLICY "vehicle_sticker_insert_admin" ON vehicle_sticker
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

-- Update: Admin users and household-head (for their household's stickers)
CREATE POLICY "vehicle_sticker_update_admin_or_household_head" ON vehicle_sticker
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can update any sticker
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
      -- OR household-head can update stickers for their household
      OR (
        vehicle_sticker.household_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM resident res
          JOIN tenant_user tu ON tu.id = res.tenant_user_id
          JOIN role r ON r.id = tu.role_id
          WHERE res.household_id = vehicle_sticker.household_id
          AND tu.user_profile_id = (
            SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
          )
          AND tu.is_active = true
          AND r.code = 'household-head'
        )
      )
    )
  );

-- Delete: Admin-head only
CREATE POLICY "vehicle_sticker_delete_admin" ON vehicle_sticker
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

COMMENT ON POLICY "vehicle_sticker_read_tenant" ON vehicle_sticker IS 'All tenant users can view vehicle stickers in their tenant';
COMMENT ON POLICY "vehicle_sticker_insert_admin" ON vehicle_sticker IS 'Only admin users can create vehicle stickers';
COMMENT ON POLICY "vehicle_sticker_update_admin_or_household_head" ON vehicle_sticker IS 'Admin users and household heads can update vehicle stickers';
COMMENT ON POLICY "vehicle_sticker_delete_admin" ON vehicle_sticker IS 'Only admin-head can delete vehicle stickers';
