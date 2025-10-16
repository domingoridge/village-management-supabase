-- Create permit type enum
CREATE TYPE permit_type AS ENUM ('construction', 'renovation', 'maintenance', 'miscellaneous');

-- Create permit status enum
CREATE TYPE permit_status AS ENUM (
  'draft',
  'submitted',
  'pending_payment',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'cancelled'
);

-- Create permits table
CREATE TABLE
  IF NOT EXISTS permit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES tenant_user (id) ON DELETE RESTRICT,
    permit_number VARCHAR(50) UNIQUE NOT NULL,
    project_description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    permit_type permit_type NOT NULL,
    status permit_status NOT NULL DEFAULT 'draft',
    fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (fee_amount >= 0),
    fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
    fee_paid_at TIMESTAMPTZ,
    fee_receipt_url TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES tenant_user (id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    distributed_to_guardhouse_at TIMESTAMPTZ,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    CONSTRAINT check_end_date_after_start_date CHECK (end_date >= start_date),
    CONSTRAINT check_fee_paid_at_when_paid CHECK (
      (fee_paid = TRUE AND fee_paid_at IS NOT NULL) OR
      (fee_paid = FALSE AND fee_paid_at IS NULL)
    ),
    CONSTRAINT check_approved_at_when_approved CHECK (
      (status = 'approved' AND approved_at IS NOT NULL) OR
      (status != 'approved')
    )
  );

-- Create indexes
CREATE INDEX idx_permit_tenant_id ON permit (tenant_id);

CREATE INDEX idx_permit_household_id ON permit (household_id);

CREATE INDEX idx_permit_requested_by ON permit (requested_by);

CREATE INDEX idx_permit_permit_number ON permit (permit_number);

CREATE INDEX idx_permit_status ON permit (status);

CREATE INDEX idx_permit_type ON permit (permit_type);

CREATE INDEX idx_permit_fee_paid ON permit (fee_paid) WHERE fee_paid = FALSE;

CREATE INDEX idx_permit_start_date ON permit (start_date);

CREATE INDEX idx_permit_end_date ON permit (end_date);

-- Create GIN index for documents JSONB
CREATE INDEX idx_permit_documents ON permit USING GIN (documents);

-- Enable RLS
ALTER TABLE permit ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE permit IS 'Generic permit system for construction, renovation, maintenance, and miscellaneous approvals';

COMMENT ON COLUMN permit.permit_type IS 'Type of permit: construction, renovation, maintenance, or miscellaneous';

COMMENT ON COLUMN permit.fee_amount IS 'Fee amount for the permit (e.g., road fee for construction, venue fee for events)';

COMMENT ON COLUMN permit.fee_paid IS 'Whether the permit fee has been paid';

COMMENT ON COLUMN permit.fee_receipt_url IS 'Supabase storage path to fee payment receipt';

COMMENT ON COLUMN permit.documents IS 'Array of document URLs from Supabase storage (permits, plans, contracts, etc.)';

COMMENT ON COLUMN permit.distributed_to_guardhouse_at IS 'When the approved permit was distributed to guards for gate access control';
