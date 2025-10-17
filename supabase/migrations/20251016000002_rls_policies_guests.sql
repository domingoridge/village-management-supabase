-- ============================================================================
-- RLS Policies for Guests Table
-- ============================================================================
-- Ensures tenant isolation and role-based access control for guest management
-- ============================================================================

-- Read: Users can view guests in their tenant
CREATE POLICY "guests_read_by_tenant_member" ON guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_user
      WHERE tenant_user.tenant_id = guests.tenant_id
      AND tenant_user.user_profile_id = (
        SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
      )
      AND tenant_user.is_active = true
    )
    OR public.is_superadmin()
  );

-- Insert: Residents can announce guests for their household
CREATE POLICY "guests_insert_by_resident" ON guests
  FOR INSERT
  WITH CHECK (
    -- Must be a resident of the household with visiting rights
    EXISTS (
      SELECT 1 FROM resident res
      JOIN tenant_user tu ON tu.id = res.tenant_user_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE res.household_id = guests.household_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND res.has_visiting_rights = true
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

-- Update: Announcer, guards, or admins can update guests
CREATE POLICY "guests_update_by_announcer_guard_or_admin" ON guests
  FOR UPDATE
  USING (
    -- Announcer can update if guest is still pending
    (
      announced_by IN (
        SELECT tu.id FROM tenant_user tu
        JOIN user_profile up ON up.id = tu.user_profile_id
        WHERE up.auth_user_id = auth.uid()
        AND tu.is_active = true
      )
      AND status IN ('pending')
    )
    -- OR guards can update (to confirm, mark arrived, etc.)
    OR EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = guests.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('security-head', 'security-officer')
    )
    -- OR admins can update any guest
    OR EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = guests.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
    )
  );

-- Delete: Announcer can delete pending/cancelled guests, admins can delete any
CREATE POLICY "guests_delete_by_announcer_or_admin" ON guests
  FOR DELETE
  USING (
    -- Announcer can delete if guest is pending or cancelled
    (
      announced_by IN (
        SELECT tu.id FROM tenant_user tu
        JOIN user_profile up ON up.id = tu.user_profile_id
        WHERE up.auth_user_id = auth.uid()
        AND tu.is_active = true
      )
      AND status IN ('pending', 'cancelled')
    )
    -- OR admins can delete any guest
    OR EXISTS (
      SELECT 1 FROM tenant_user tu
      JOIN role r ON r.id = tu.role_id
      JOIN user_profile up ON up.id = tu.user_profile_id
      WHERE tu.tenant_id = guests.tenant_id
      AND up.auth_user_id = auth.uid()
      AND tu.is_active = true
      AND r.code IN ('superadmin', 'admin-head')
    )
  );

-- Add policy descriptions
COMMENT ON POLICY "guests_read_by_tenant_member" ON guests IS 'Users can view guests within their tenant';

COMMENT ON POLICY "guests_insert_by_resident" ON guests IS 'Residents with visiting rights can announce guests for their household';

COMMENT ON POLICY "guests_update_by_announcer_guard_or_admin" ON guests IS 'Announcers can update pending guests; guards can confirm/update status; admins can update any guest';

COMMENT ON POLICY "guests_delete_by_announcer_or_admin" ON guests IS 'Announcers can delete pending/cancelled guests; admins can delete any guest';
