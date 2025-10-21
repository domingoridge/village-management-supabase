-- ============================================================================
-- RLS Policies for Permit Document Table
-- ============================================================================
-- Ensures tenant isolation and role-based access control for permit documents
-- ============================================================================

-- Read: All tenant users can view permit documents in their tenant
CREATE POLICY "permit_document_read_tenant" ON permit_document
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- Insert: Admin users and permit requester (for their household's permits)
CREATE POLICY "permit_document_insert_admin_or_requester" ON permit_document
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can upload documents for any permit
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
      -- OR permit requester can upload documents for their permits
      OR EXISTS (
        SELECT 1 FROM permit p
        JOIN tenant_user tu ON tu.id = p.requested_by
        WHERE p.id = permit_document.permit_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
      )
    )
  );

-- Update: Admin users and permit requester (for their household's permits)
CREATE POLICY "permit_document_update_admin_or_requester" ON permit_document
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
      -- OR permit requester can update documents for their permits
      OR EXISTS (
        SELECT 1 FROM permit p
        JOIN tenant_user tu ON tu.id = p.requested_by
        WHERE p.id = permit_document.permit_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
      )
    )
  );

-- Delete: Admin users only
CREATE POLICY "permit_document_delete_admin" ON permit_document
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

-- Add policy descriptions
COMMENT ON POLICY "permit_document_read_tenant" ON permit_document IS 'All tenant users can view permit documents in their tenant';
COMMENT ON POLICY "permit_document_insert_admin_or_requester" ON permit_document IS 'Admin users and permit requesters can upload documents for permits';
COMMENT ON POLICY "permit_document_update_admin_or_requester" ON permit_document IS 'Admin users and permit requesters can update permit documents';
COMMENT ON POLICY "permit_document_delete_admin" ON permit_document IS 'Only admin users can delete permit documents';
