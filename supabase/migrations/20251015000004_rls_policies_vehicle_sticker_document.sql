-- Vehicle Sticker Document RLS Policies

-- Read: All tenant users can view vehicle sticker documents in their tenant
CREATE POLICY "vehicle_sticker_document_read_tenant" ON vehicle_sticker_document
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- Insert: Admin users and household-head (for their household's stickers)
CREATE POLICY "vehicle_sticker_document_insert_admin_or_household_head" ON vehicle_sticker_document
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can upload documents for any sticker
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
      -- OR household-head can upload documents for their household's stickers
      OR EXISTS (
        SELECT 1 FROM vehicle_sticker vs
        JOIN resident res ON res.household_id = vs.household_id
        JOIN tenant_user tu ON tu.id = res.tenant_user_id
        JOIN role r ON r.id = tu.role_id
        WHERE vs.id = vehicle_sticker_document.vehicle_sticker_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
      )
    )
  );

-- Update: Admin users and household-head (for their household's stickers)
CREATE POLICY "vehicle_sticker_document_update_admin_or_household_head" ON vehicle_sticker_document
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can update any document
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
      -- OR household-head can update documents for their household's stickers
      OR EXISTS (
        SELECT 1 FROM vehicle_sticker vs
        JOIN resident res ON res.household_id = vs.household_id
        JOIN tenant_user tu ON tu.id = res.tenant_user_id
        JOIN role r ON r.id = tu.role_id
        WHERE vs.id = vehicle_sticker_document.vehicle_sticker_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
      )
    )
  );

-- Delete: Admin users only
CREATE POLICY "vehicle_sticker_document_delete_admin" ON vehicle_sticker_document
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
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
    )
  );

COMMENT ON POLICY "vehicle_sticker_document_read_tenant" ON vehicle_sticker_document IS 'All tenant users can view vehicle sticker documents in their tenant';
COMMENT ON POLICY "vehicle_sticker_document_insert_admin_or_household_head" ON vehicle_sticker_document IS 'Admin users and household heads can upload documents for vehicle stickers';
COMMENT ON POLICY "vehicle_sticker_document_update_admin_or_household_head" ON vehicle_sticker_document IS 'Admin users and household heads can update vehicle sticker documents';
COMMENT ON POLICY "vehicle_sticker_document_delete_admin" ON vehicle_sticker_document IS 'Only admin users can delete vehicle sticker documents';
