-- Create household status enum
CREATE TYPE household_status AS ENUM ('active', 'inactive', 'suspended');

-- Create household table
CREATE TABLE IF NOT EXISTS household (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  address VARCHAR(255) NOT NULL,
  block VARCHAR(50),
  lot VARCHAR(50),
  street_number VARCHAR(50),
  house_number VARCHAR(50),
  alias VARCHAR(255),
  sticker_quota INTEGER NOT NULL DEFAULT 2 CHECK (sticker_quota >= 0),
  status household_status NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_household_tenant_id ON household(tenant_id, id);
CREATE INDEX idx_household_status ON household(status);
CREATE INDEX idx_household_block ON household(block);
CREATE INDEX idx_household_lot ON household(lot);

-- Enable RLS
ALTER TABLE household ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE household IS 'Residential property units within a tenant';
