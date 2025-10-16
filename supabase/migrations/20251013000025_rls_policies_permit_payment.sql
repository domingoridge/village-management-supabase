-- ============================================================================
-- RLS Policies for Permit Payment Table
-- ============================================================================
-- Ensures tenant isolation and role-based access control for permit payments
-- ============================================================================

-- Read: Users can view permit payments in their tenant
CREATE POLICY "permit_payment_read_by_tenant_member" ON permit_payment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user
      WHERE tenant_user.tenant_id = permit_payment.tenant_id
      AND tenant_user.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tenant_user.is_active = true
    )
    OR public.is_superadmin()
  );

-- Insert: Only admins can record payments
CREATE POLICY "permit_payment_insert_admin" ON permit_payment
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = permit_payment.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
    )
  );

-- Update: Only admins can update payment records (corrections)
CREATE POLICY "permit_payment_update_admin" ON permit_payment
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = permit_payment.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head')
    )
  );

-- Delete: Only superadmin can delete payment records
CREATE POLICY "permit_payment_delete_superadmin" ON permit_payment
  FOR DELETE
  USING (public.is_superadmin());

-- Add policy descriptions
COMMENT ON POLICY "permit_payment_read_by_tenant_member" ON permit_payment IS 'Users can view permit payments within their tenant';

COMMENT ON POLICY "permit_payment_insert_admin" ON permit_payment IS 'Only admins can record permit payments';

COMMENT ON POLICY "permit_payment_update_admin" ON permit_payment IS 'Only admin-head can update payment records';

COMMENT ON POLICY "permit_payment_delete_superadmin" ON permit_payment IS 'Only superadmin can delete payment records';
