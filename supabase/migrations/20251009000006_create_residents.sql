-- Create resident table
CREATE TABLE IF NOT EXISTS resident (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES tenant_user(id) ON DELETE CASCADE,
  has_visiting_rights BOOLEAN NOT NULL DEFAULT false,
  has_signatory_rights BOOLEAN NOT NULL DEFAULT false,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  id_type VARCHAR(100),
  id_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, tenant_user_id)
);

-- Create indexes
CREATE INDEX idx_resident_household ON resident(household_id);
CREATE INDEX idx_resident_tenant_user ON resident(tenant_user_id);

-- Enable RLS
ALTER TABLE resident ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE resident IS 'Village residents - links tenant users to households with permissions';
