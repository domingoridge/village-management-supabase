-- Create guest status enum
CREATE TYPE guest_status AS ENUM (
  'pending',
  'confirmed',
  'arrived',
  'completed',
  'cancelled'
);

-- Create guests table
CREATE TABLE
  IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    announced_by UUID NOT NULL REFERENCES tenant_user (id) ON DELETE RESTRICT,
    guest_name VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50),
    guest_email VARCHAR(255),
    vehicle_plate VARCHAR(50),
    visit_duration TEXT,
    visit_date_start DATE NOT NULL,
    visit_date_end DATE,
    expected_arrival_time TEXT,
    special_instructions TEXT,
    visit_purpose TEXT,
    qr_code VARCHAR(255) UNIQUE,
    status guest_status NOT NULL DEFAULT 'pending',
    notified_guards_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES tenant_user (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    CONSTRAINT check_visit_date_end_after_start CHECK (
      visit_date_end IS NULL OR visit_date_end >= visit_date_start
    ),
    CONSTRAINT check_confirmed_at_when_confirmed CHECK (
      (status IN ('confirmed', 'arrived', 'completed') AND confirmed_at IS NOT NULL) OR
      (status NOT IN ('confirmed', 'arrived', 'completed'))
    ),
    CONSTRAINT check_confirmed_by_when_confirmed CHECK (
      (status IN ('confirmed', 'arrived', 'completed') AND confirmed_by IS NOT NULL) OR
      (status NOT IN ('confirmed', 'arrived', 'completed'))
    )
  );

-- Create indexes
CREATE INDEX idx_guests_tenant_id ON guests (tenant_id);

CREATE INDEX idx_guests_household_id ON guests (household_id);

CREATE INDEX idx_guests_announced_by ON guests (announced_by);

CREATE INDEX idx_guests_confirmed_by ON guests (confirmed_by);

CREATE INDEX idx_guests_status ON guests (status);

CREATE INDEX idx_guests_visit_date_start ON guests (visit_date_start);

CREATE INDEX idx_guests_visit_date_end ON guests (visit_date_end) WHERE visit_date_end IS NOT NULL;

CREATE INDEX idx_guests_qr_code ON guests (qr_code) WHERE qr_code IS NOT NULL;

CREATE INDEX idx_guests_guest_name ON guests (guest_name);

CREATE INDEX idx_guests_vehicle_plate ON guests (vehicle_plate) WHERE vehicle_plate IS NOT NULL;

-- Create composite index for active guests by tenant and household
CREATE INDEX idx_guests_tenant_household_status ON guests (tenant_id, household_id, status)
  WHERE status IN ('pending', 'confirmed', 'arrived');

-- Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE guests IS 'Guest management system for tracking visitor announcements and access';

COMMENT ON COLUMN guests.tenant_id IS 'Tenant isolation - which residential community this guest is visiting';

COMMENT ON COLUMN guests.household_id IS 'The household being visited';

COMMENT ON COLUMN guests.announced_by IS 'The tenant user (resident) who announced the guest';

COMMENT ON COLUMN guests.guest_name IS 'Full name of the guest';

COMMENT ON COLUMN guests.guest_phone IS 'Contact phone number of the guest';

COMMENT ON COLUMN guests.guest_email IS 'Email address of the guest';

COMMENT ON COLUMN guests.vehicle_plate IS 'Vehicle plate number if guest is arriving by car';

COMMENT ON COLUMN guests.visit_duration IS 'Expected duration of visit (free text)';

COMMENT ON COLUMN guests.visit_date_start IS 'Start date of the visit';

COMMENT ON COLUMN guests.visit_date_end IS 'End date of the visit (nullable for day visits)';

COMMENT ON COLUMN guests.expected_arrival_time IS 'Expected arrival time (free text format)';

COMMENT ON COLUMN guests.special_instructions IS 'Special instructions or notes for guards regarding the guest';

COMMENT ON COLUMN guests.visit_purpose IS 'Purpose or reason for the visit';

COMMENT ON COLUMN guests.qr_code IS 'Generated QR code for contactless entry at the gate';

COMMENT ON COLUMN guests.status IS 'Current status: pending, confirmed, arrived, completed, or cancelled';

COMMENT ON COLUMN guests.notified_guards_at IS 'Timestamp when guards were notified about this guest';

COMMENT ON COLUMN guests.confirmed_at IS 'Timestamp when the guest was confirmed by security';

COMMENT ON COLUMN guests.confirmed_by IS 'Tenant user (guard) who confirmed the guest';
