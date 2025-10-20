-- ============================================================================
-- UPDATE VEHICLE STICKER: RFID_CODE & EXPIRY_DATE NULLABLE, NEW STATUS VALUES
-- ============================================================================
-- This migration:
-- 1. Alters the vehicle_sticker table to make rfid_code nullable
-- 2. Alters the vehicle_sticker table to make expiry_date nullable
-- 3. Adds new status enum value: 'requested'
-- 4. Updates check constraint to handle nullable expiry_date
-- ============================================================================

-- Add new enum values to sticker_status
-- 'requested' - for stickers that have been requested but not yet issued
-- 'expired' - replaces the old 'expired' status (keeping for backward compatibility)
ALTER TYPE sticker_status ADD VALUE IF NOT EXISTS 'requested';

-- Note: 'expired' already exists in the original enum definition
-- Original enum: ('active', 'expired', 'revoked', 'pending_renewal')

-- Alter the rfid_code column to allow NULL values
ALTER TABLE vehicle_sticker
  ALTER COLUMN rfid_code DROP NOT NULL;

-- Drop the existing unique constraint that includes rfid_code
ALTER TABLE vehicle_sticker
  DROP CONSTRAINT IF EXISTS uk_vehicle_sticker_rfid_code;

-- Recreate the unique constraint to allow multiple NULL values
-- Note: In PostgreSQL, NULL values are considered distinct, so multiple NULLs are allowed
-- We only enforce uniqueness when rfid_code is NOT NULL
CREATE UNIQUE INDEX uk_vehicle_sticker_rfid_code
  ON vehicle_sticker(tenant_id, rfid_code)
  WHERE rfid_code IS NOT NULL;

-- Update comment to reflect the nullable nature
COMMENT ON COLUMN vehicle_sticker.rfid_code IS 'RFID code embedded in the sticker, unique per tenant when assigned (nullable to allow sticker creation before RFID assignment)';

-- Alter the expiry_date column to allow NULL values
ALTER TABLE vehicle_sticker
  ALTER COLUMN expiry_date DROP NOT NULL;

-- Drop the existing check constraint that requires expiry_date
ALTER TABLE vehicle_sticker
  DROP CONSTRAINT IF EXISTS check_expiry_after_issue;

-- Recreate the check constraint to handle NULL expiry_date
-- Only enforce the constraint when expiry_date is NOT NULL
ALTER TABLE vehicle_sticker
  ADD CONSTRAINT check_expiry_after_issue
  CHECK (expiry_date IS NULL OR expiry_date > issue_date);

-- Update comment to reflect the nullable nature
COMMENT ON COLUMN vehicle_sticker.expiry_date IS 'Expiry date of the sticker (nullable to allow sticker creation before expiry date is assigned, e.g., for requested stickers)';
