-- ============================================================================
-- UPDATE VEHICLE DOCUMENT TYPE ENUM
-- ============================================================================
-- This migration updates the vehicle_document_type enum to:
-- - Remove: insurance, deed_of_sale
-- - Add: car_photo
-- Final values: or, cr, drivers_license, car_photo, other
-- ============================================================================

-- Step 1: Add new value 'car_photo'
ALTER TYPE vehicle_document_type ADD VALUE IF NOT EXISTS 'car_photo';

-- Step 2: Create a new enum type with the desired values
CREATE TYPE vehicle_document_type_new AS ENUM (
  'or',
  'cr',
  'drivers_license',
  'car_photo',
  'other'
);

-- Step 3: Alter the column to use the new type
-- This requires a two-step conversion through text
ALTER TABLE vehicle_sticker_document
  ALTER COLUMN document_type TYPE vehicle_document_type_new
  USING document_type::text::vehicle_document_type_new;

-- Step 4: Drop the old enum type
DROP TYPE vehicle_document_type;

-- Step 5: Rename the new type to the original name
ALTER TYPE vehicle_document_type_new RENAME TO vehicle_document_type;

-- Update comment to reflect new values
COMMENT ON TYPE vehicle_document_type IS 'Vehicle document types: or (official receipt), cr (certificate of registration), drivers_license, car_photo, other';
