-- ============================================================================
-- UPDATE VEHICLE STICKER DOCUMENT RLS POLICIES
-- ============================================================================
-- This migration updates the INSERT and UPDATE policies for vehicle_sticker_document
-- to fix table reference scoping issues that prevented admin-head from inserting/updating.
-- ============================================================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "vehicle_sticker_document_insert_admin_or_household_head" ON vehicle_sticker_document;

-- Recreate INSERT policy - Admins OR household-head for their own household
CREATE POLICY "vehicle_sticker_document_insert_admin_or_household_head" ON vehicle_sticker_document
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can create any vehicle sticker document
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
      -- OR household-head can create documents for their household's vehicle stickers
      OR EXISTS (
        SELECT 1
        FROM vehicle_sticker vs
        INNER JOIN resident res ON res.household_id = vs.household_id
        INNER JOIN tenant_user tu ON tu.id = res.tenant_user_id
        INNER JOIN role r ON r.id = tu.role_id
        WHERE vs.id = vehicle_sticker_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
        AND vs.household_id IS NOT NULL
      )
    )
  );

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "vehicle_sticker_document_update_admin_or_household_head" ON vehicle_sticker_document;

-- Recreate UPDATE policy - Admins OR household-head for their own household
CREATE POLICY "vehicle_sticker_document_update_admin_or_household_head" ON vehicle_sticker_document
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id() AND
    (
      -- Admins can update any vehicle sticker document
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
      -- OR household-head can update documents for their household's vehicle stickers
      OR EXISTS (
        SELECT 1
        FROM vehicle_sticker vs
        INNER JOIN resident res ON res.household_id = vs.household_id
        INNER JOIN tenant_user tu ON tu.id = res.tenant_user_id
        INNER JOIN role r ON r.id = tu.role_id
        WHERE vs.id = vehicle_sticker_document.vehicle_sticker_id
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
        AND r.code = 'household-head'
        AND vs.household_id IS NOT NULL
      )
    )
  );

-- Update comments to reflect the fixes
COMMENT ON POLICY "vehicle_sticker_document_insert_admin_or_household_head" ON vehicle_sticker_document IS 'Admin users can upload documents for any sticker; household-head can upload for their household stickers';
COMMENT ON POLICY "vehicle_sticker_document_update_admin_or_household_head" ON vehicle_sticker_document IS 'Admin users can update any document; household-head can update their household sticker documents';
