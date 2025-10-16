-- Create role scope enum
CREATE TYPE role_scope AS ENUM ('platform', 'tenant', 'household', 'security');

-- Create roles table
CREATE TABLE IF NOT EXISTS role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  scope role_scope NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  hierarchy_level INTEGER NOT NULL CHECK (hierarchy_level > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_role_hierarchy ON role(hierarchy_level);
CREATE INDEX idx_role_scope ON role(scope);

-- Enable RLS
ALTER TABLE role ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read (needed for permission checks)
CREATE POLICY "role_public_read" ON role
  FOR SELECT
  USING (true);

-- Seed 8 predefined roles
INSERT INTO role (code, name, scope, hierarchy_level, permissions) VALUES
  ('superadmin', 'Super Administrator', 'platform', 1, '{"manage_all_tenants": true, "impersonate_users": true}'),
  ('admin-head', 'Head Administrator', 'tenant', 2, '{"manage_tenant_settings": true, "manage_users": true, "manage_households": true}'),
  ('admin-officers', 'Administrative Officer', 'tenant', 3, '{"manage_households": true, "view_reports": true}'),
  ('security-head', 'Security Head', 'security', 3, '{"manage_security_personnel": true, "escalate_incidents": true}'),
  ('household-head', 'Household Head', 'household', 4, '{"manage_residents": true, "announce_guests": true, "request_permits": true}'),
  ('security-officer', 'Security Officer', 'security', 4, '{"log_gate_entries": true, "report_incidents": true, "verify_guests": true}'),
  ('household-member', 'Household Member', 'household', 5, '{"view_household": true, "announce_guests": false}'),
  ('household-beneficial-user', 'Beneficial User', 'household', 6, '{"view_vehicle_pass": true}');

COMMENT ON TABLE role IS 'Predefined system roles with hierarchy and permissions';
