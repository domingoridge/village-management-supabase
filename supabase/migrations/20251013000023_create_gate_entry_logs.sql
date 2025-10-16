-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on the following tables existing:
-- - tenant (EXISTS - created in earlier migration)
-- - tenant_user (EXISTS - created in earlier migration)
-- - permit (EXISTS - created in 20251013000021_create_permits.sql)
--
-- The following tables are referenced but NOT required for this migration:
-- - vehicle_sticker (will be created in future migration)
-- - guests (will be created in future migration)
-- - delivery (will be created in future migration)
--
-- Foreign key constraints for these tables will be added in a follow-up migration
-- once those tables are created. For now, we store UUIDs without FK constraints.
-- ============================================================================

-- Create entry type enum
CREATE TYPE entry_type AS ENUM (
  'vehicle_rfid',
  'guest',
  'delivery',
  'permit_holder',
  'visitor'
);

-- Create verification method enum
CREATE TYPE verification_method AS ENUM (
  'rfid_auto',
  'manual',
  'guest_list',
  'phone_call',
  'qr_code'
);

-- Create entry outcome enum
CREATE TYPE entry_outcome AS ENUM ('allowed', 'denied');

-- Create gate entry log table
CREATE TABLE
  IF NOT EXISTS gate_entry_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    gate VARCHAR(100) NOT NULL,
    entry_type entry_type NOT NULL,
    -- Foreign keys to be added later when tables are created
    vehicle_sticker_id UUID,
    guest_id UUID,
    delivery_id UUID,
    -- Permit foreign key (table exists)
    permit_id UUID REFERENCES permit (id) ON DELETE SET NULL,
    visitor_name VARCHAR(255),
    plate_number VARCHAR(50),
    purpose TEXT,
    verification_method verification_method NOT NULL,
    -- Tenant user (security guard) who verified the entry
    verified_by UUID REFERENCES tenant_user (id) ON DELETE SET NULL,
    outcome entry_outcome NOT NULL,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT now (),
    exit_time TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    CONSTRAINT check_exit_after_entry CHECK (
      exit_time IS NULL OR exit_time >= entry_time
    ),
    CONSTRAINT check_vehicle_sticker_for_rfid CHECK (
      (entry_type = 'vehicle_rfid' AND vehicle_sticker_id IS NOT NULL) OR
      (entry_type != 'vehicle_rfid')
    ),
    CONSTRAINT check_guest_for_guest_entry CHECK (
      (entry_type = 'guest' AND guest_id IS NOT NULL) OR
      (entry_type != 'guest')
    ),
    CONSTRAINT check_delivery_for_delivery_entry CHECK (
      (entry_type = 'delivery' AND delivery_id IS NOT NULL) OR
      (entry_type != 'delivery')
    ),
    CONSTRAINT check_permit_for_permit_entry CHECK (
      (entry_type = 'permit_holder' AND permit_id IS NOT NULL) OR
      (entry_type != 'permit_holder')
    )
  );

-- Create indexes
CREATE INDEX idx_gate_entry_log_tenant_id ON gate_entry_log (tenant_id);

CREATE INDEX idx_gate_entry_log_gate ON gate_entry_log (gate);

CREATE INDEX idx_gate_entry_log_entry_type ON gate_entry_log (entry_type);

CREATE INDEX idx_gate_entry_log_vehicle_sticker_id ON gate_entry_log (vehicle_sticker_id) WHERE vehicle_sticker_id IS NOT NULL;

CREATE INDEX idx_gate_entry_log_guest_id ON gate_entry_log (guest_id) WHERE guest_id IS NOT NULL;

CREATE INDEX idx_gate_entry_log_delivery_id ON gate_entry_log (delivery_id) WHERE delivery_id IS NOT NULL;

CREATE INDEX idx_gate_entry_log_permit_id ON gate_entry_log (permit_id) WHERE permit_id IS NOT NULL;

CREATE INDEX idx_gate_entry_log_verified_by ON gate_entry_log (verified_by);

CREATE INDEX idx_gate_entry_log_outcome ON gate_entry_log (outcome);

CREATE INDEX idx_gate_entry_log_entry_time ON gate_entry_log (entry_time DESC);

CREATE INDEX idx_gate_entry_log_exit_time ON gate_entry_log (exit_time) WHERE exit_time IS NOT NULL;

CREATE INDEX idx_gate_entry_log_plate_number ON gate_entry_log (plate_number) WHERE plate_number IS NOT NULL;

-- Create GIN index for metadata
CREATE INDEX idx_gate_entry_log_metadata ON gate_entry_log USING GIN (metadata);

-- Create composite index for active entries (no exit time)
CREATE INDEX idx_gate_entry_log_active ON gate_entry_log (tenant_id, entry_time DESC) WHERE exit_time IS NULL;

-- Enable RLS
ALTER TABLE gate_entry_log ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE gate_entry_log IS 'Comprehensive log of all gate entry and exit events for security and access control';

COMMENT ON COLUMN gate_entry_log.gate IS 'Gate identifier (e.g., "South Gate", "Gate 1", "Main Gate")';

COMMENT ON COLUMN gate_entry_log.entry_type IS 'Type of entry: vehicle_rfid (resident/authorized vehicle), guest, delivery, permit_holder (construction/maintenance/misc), visitor';

COMMENT ON COLUMN gate_entry_log.permit_id IS 'Reference to permit for construction workers, maintenance personnel, or other permit holders';

COMMENT ON COLUMN gate_entry_log.visitor_name IS 'Name of visitor for non-registered entries';

COMMENT ON COLUMN gate_entry_log.plate_number IS 'Vehicle plate number for gate entry';

COMMENT ON COLUMN gate_entry_log.verification_method IS 'How the entry was verified (RFID auto, manual check, guest list, phone call, QR code)';

COMMENT ON COLUMN gate_entry_log.outcome IS 'Whether entry was allowed or denied';

COMMENT ON COLUMN gate_entry_log.metadata IS 'Additional information (temperature check, photo URLs, special notes, etc.)';
