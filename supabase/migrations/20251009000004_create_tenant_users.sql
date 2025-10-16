-- Create tenant_user table (junction: user <-> tenant <-> role)
CREATE TABLE IF NOT EXISTS tenant_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_profile_id)
);

-- Create indexes
CREATE INDEX idx_tenant_user_tenant ON tenant_user(tenant_id);
CREATE INDEX idx_tenant_user_profile ON tenant_user(user_profile_id);
CREATE INDEX idx_tenant_user_role ON tenant_user(role_id);
CREATE INDEX idx_tenant_user_active ON tenant_user(is_active);

-- Enable RLS
ALTER TABLE tenant_user ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE tenant_user IS 'Junction table linking users to tenants with role assignments';
