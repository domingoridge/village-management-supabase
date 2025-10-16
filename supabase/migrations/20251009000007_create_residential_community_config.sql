-- Create residential_community_config table
CREATE TABLE IF NOT EXISTS residential_community_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  rules_and_guidelines JSONB NOT NULL DEFAULT '{}',
  curfew_settings JSONB NOT NULL DEFAULT '{"enabled": false, "start_time": null, "end_time": null, "exceptions": []}',
  gate_operating_hours JSONB NOT NULL DEFAULT '{"twenty_four_seven": true}',
  visitor_policies JSONB NOT NULL DEFAULT '{}',
  emergency_contacts JSONB NOT NULL DEFAULT '[]',
  maintenance_schedule JSONB NOT NULL DEFAULT '{}',
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES tenant_user(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX idx_residential_config_tenant ON residential_community_config(tenant_id);

-- Enable RLS
ALTER TABLE residential_community_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE residential_community_config IS 'Tenant-specific configuration for rules, curfews, and operations';
