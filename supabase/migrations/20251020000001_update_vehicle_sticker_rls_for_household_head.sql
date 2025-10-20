-- ============================================================================
-- UPDATE VEHICLE STICKER RLS POLICIES FOR HOUSEHOLD-HEAD
-- ============================================================================
-- This migration updates the INSERT policy for vehicle_sticker to allow
-- household-head users to insert stickers for their own household.
-- ============================================================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "vehicle_sticker_insert_admin" ON vehicle_sticker;

-- Recreate INSERT policy: Admins can insert for any household, household-head can insert for their own household
CREATE POLICY "vehicle_sticker_insert_admin_or_household_head" ON vehicle_sticker
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can create any vehicle sticker
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
      -- OR household-head can create stickers for their own household
      OR EXISTS (
        SELECT 1 FROM resident res
        JOIN tenant_user tu ON tu.id = res.tenant_user_id
        JOIN role r ON r.id = tu.role_id
        WHERE res.household_id = household_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
        AND household_id IS NOT NULL
      )
    )
  );

-- Update comment to reflect new permissions
COMMENT ON POLICY "vehicle_sticker_insert_admin_or_household_head" ON vehicle_sticker IS 'Admin users can create any vehicle sticker; household-head can create stickers for their own household';
