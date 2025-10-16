-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on the following tables existing:
-- - tenant (EXISTS - created in earlier migration)
-- - household (EXISTS - created in earlier migration)
-- - tenant_user (EXISTS - created in earlier migration)
-- ============================================================================

-- Create sticker type enum
CREATE TYPE sticker_type AS ENUM ('beneficial_user', 'resident');

-- Create sticker status enum
CREATE TYPE sticker_status AS ENUM ('active', 'expired', 'revoked', 'pending_renewal');

-- Create vehicle sticker table
CREATE TABLE IF NOT EXISTS vehicle_sticker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  rfid_code VARCHAR(100) NOT NULL,
  household_id UUID REFERENCES household(id) ON DELETE SET NULL,
  issued_to UUID NOT NULL REFERENCES tenant_user(id) ON DELETE CASCADE,
  vehicle_plate_number VARCHAR(50) NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  sticker_type sticker_type NOT NULL,
  vehicle_make VARCHAR(100),
  vehicle_color VARCHAR(50),
  vehicle_model VARCHAR(100),
  vehicle_year VARCHAR(4),
  vehicle_registered_to VARCHAR(255),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  status sticker_status NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_vehicle_sticker_rfid_code UNIQUE (tenant_id, rfid_code),
  CONSTRAINT check_expiry_after_issue CHECK (expiry_date > issue_date)
);

-- Create indexes
CREATE INDEX idx_vehicle_sticker_tenant_id ON vehicle_sticker(tenant_id);
CREATE INDEX idx_vehicle_sticker_household_id ON vehicle_sticker(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_vehicle_sticker_issued_to ON vehicle_sticker(issued_to);
CREATE INDEX idx_vehicle_sticker_rfid_code ON vehicle_sticker(rfid_code);
CREATE INDEX idx_vehicle_sticker_plate_number ON vehicle_sticker(vehicle_plate_number);
CREATE INDEX idx_vehicle_sticker_status ON vehicle_sticker(status);
CREATE INDEX idx_vehicle_sticker_sticker_type ON vehicle_sticker(sticker_type);
CREATE INDEX idx_vehicle_sticker_expiry_date ON vehicle_sticker(expiry_date) WHERE status = 'active';

-- Create composite index for tenant-based queries
CREATE INDEX idx_vehicle_sticker_tenant_status ON vehicle_sticker(tenant_id, status);

-- Create GIN index for metadata
CREATE INDEX idx_vehicle_sticker_metadata ON vehicle_sticker USING GIN(metadata);

-- Enable RLS
ALTER TABLE vehicle_sticker ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE vehicle_sticker IS 'Vehicle stickers for residents and beneficial users (employees, contractors, etc.)';
COMMENT ON COLUMN vehicle_sticker.rfid_code IS 'RFID code embedded in the sticker, unique per tenant';
COMMENT ON COLUMN vehicle_sticker.household_id IS 'Nullable - allows issuing stickers to non-household members like village employees';
COMMENT ON COLUMN vehicle_sticker.issued_to IS 'The tenant_user this sticker is issued to';
COMMENT ON COLUMN vehicle_sticker.sticker_type IS 'Type of sticker: resident (household member) or beneficial_user (employee, contractor)';
COMMENT ON COLUMN vehicle_sticker.vehicle_make IS 'Vehicle manufacturer (e.g., Toyota, Honda)';
COMMENT ON COLUMN vehicle_sticker.vehicle_color IS 'Vehicle color';
COMMENT ON COLUMN vehicle_sticker.vehicle_model IS 'Vehicle model (e.g., Civic, Vios)';
COMMENT ON COLUMN vehicle_sticker.vehicle_year IS 'Vehicle year of manufacture';
COMMENT ON COLUMN vehicle_sticker.vehicle_registered_to IS 'Name on vehicle registration document';
