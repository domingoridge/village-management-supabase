-- Create payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'gcash', 'paymaya', 'card');

-- Create permit payments table
CREATE TABLE
  IF NOT EXISTS permit_payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    permit_id UUID NOT NULL REFERENCES permit (id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now (),
    collected_by UUID NOT NULL REFERENCES tenant_user (id) ON DELETE RESTRICT,
    payment_method payment_method NOT NULL,
    receipt_url TEXT,
    payment_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now ()
  );

-- Create indexes
CREATE INDEX idx_permit_payment_tenant_id ON permit_payment (tenant_id);

CREATE INDEX idx_permit_payment_permit_id ON permit_payment (permit_id);

CREATE INDEX idx_permit_payment_receipt_number ON permit_payment (receipt_number);

CREATE INDEX idx_permit_payment_payment_date ON permit_payment (payment_date);

CREATE INDEX idx_permit_payment_collected_by ON permit_payment (collected_by);

CREATE INDEX idx_permit_payment_payment_method ON permit_payment (payment_method);

-- Create GIN index for payment metadata
CREATE INDEX idx_permit_payment_metadata ON permit_payment USING GIN (payment_metadata);

-- Enable RLS
ALTER TABLE permit_payment ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE permit_payment IS 'Payment records for permit fees (construction, renovation, maintenance, miscellaneous)';

COMMENT ON COLUMN permit_payment.amount IS 'Payment amount in decimal format';

COMMENT ON COLUMN permit_payment.receipt_number IS 'Unique receipt number for the payment';

COMMENT ON COLUMN permit_payment.receipt_url IS 'Supabase storage path to scanned receipt document';

COMMENT ON COLUMN permit_payment.payment_metadata IS 'Additional payment information (transaction ID, reference number, notes, etc.)';
