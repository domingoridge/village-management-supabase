-- Create tenant status enum
CREATE TYPE tenant_status AS ENUM ('active', 'inactive');

-- Create tenants table
CREATE TABLE
  IF NOT EXISTS tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(100),
    province VARCHAR(100),
    municipality VARCHAR(100),
    barangay VARCHAR(100),
    coordinates JSONB,
    status tenant_status NOT NULL DEFAULT 'inactive',
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    CONSTRAINT check_tenant_coordinates_structure CHECK (
      coordinates IS NULL OR (
        jsonb_typeof(coordinates) = 'object' AND
        coordinates ? 'lat' AND
        coordinates ? 'lng' AND
        jsonb_typeof(coordinates->'lat') = 'number' AND
        jsonb_typeof(coordinates->'lng') = 'number' AND
        (coordinates->>'lat')::numeric BETWEEN -90 AND 90 AND
        (coordinates->>'lng')::numeric BETWEEN -180 AND 180
      )
    )
  );

-- Create indexes
CREATE INDEX idx_tenant_status ON tenant (status);

CREATE INDEX idx_tenant_slug ON tenant (slug);

-- Create indexes for Philippine address hierarchy
CREATE INDEX idx_tenant_region ON tenant (region) WHERE region IS NOT NULL;

CREATE INDEX idx_tenant_province ON tenant (province) WHERE province IS NOT NULL;

CREATE INDEX idx_tenant_municipality ON tenant (municipality) WHERE municipality IS NOT NULL;

CREATE INDEX idx_tenant_barangay ON tenant (barangay) WHERE barangay IS NOT NULL;

-- Create GIN index for JSONB coordinates for geospatial queries
CREATE INDEX idx_tenant_coordinates ON tenant USING GIN (coordinates) WHERE coordinates IS NOT NULL;

-- Enable RLS
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;

-- Add column comments
COMMENT ON TABLE tenant IS 'Independent residential community organizations with isolated data. Location uses Philippine address hierarchy.';

COMMENT ON COLUMN tenant.region IS 'Philippine region (e.g., NCR, Region IV-A CALABARZON)';

COMMENT ON COLUMN tenant.province IS 'Philippine province (e.g., Metro Manila, Cavite)';

COMMENT ON COLUMN tenant.municipality IS 'Philippine city or municipality (e.g., Pasig City, Bacoor)';

COMMENT ON COLUMN tenant.barangay IS 'Philippine barangay (e.g., Kapitolyo, Molino VI)';

COMMENT ON COLUMN tenant.coordinates IS 'Geographic coordinates as JSON: {lat: number, lng: number, accuracy?: string, source?: string}';