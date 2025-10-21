-- ============================================================================
-- UPDATE PERMIT TABLE COLUMNS
-- ============================================================================
-- This migration:
-- 1. Makes permit_number nullable
-- 2. Drops project_description column
-- 3. Drops start_date column
-- 4. Drops end_date column
-- ============================================================================

-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on:
-- - permit table (created in 20251013000021_create_permits.sql)
-- ============================================================================

-- Drop the check constraint that validates end_date >= start_date
-- since we're dropping both columns
ALTER TABLE permit DROP CONSTRAINT IF EXISTS check_end_date_after_start_date;

-- Make permit_number nullable
ALTER TABLE permit ALTER COLUMN permit_number DROP NOT NULL;

-- Drop project_description column
ALTER TABLE permit DROP COLUMN IF EXISTS project_description;

-- Drop start_date column
ALTER TABLE permit DROP COLUMN IF EXISTS start_date;

-- Drop end_date column
ALTER TABLE permit DROP COLUMN IF EXISTS end_date;

-- Drop the indexes associated with dropped columns
DROP INDEX IF EXISTS idx_permit_start_date;
DROP INDEX IF EXISTS idx_permit_end_date;

-- Add helpful comment
COMMENT ON COLUMN permit.permit_number IS 'Optional permit number - can be auto-generated or manually assigned';
