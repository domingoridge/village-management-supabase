-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on the following tables existing:
-- - tenant (EXISTS - created in earlier migration)
-- - permit (EXISTS - created in 20251013000021_create_permits.sql)
-- ============================================================================
-- Create document type enum for permit documents
CREATE TYPE permit_document_type AS ENUM (
  'construction',
  'renovation',
  'maintenance',
  'gate_pass',
  'other'
);

-- Create permit document table
CREATE TABLE
  IF NOT EXISTS permit_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tenant_id UUID NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    permit_id UUID NOT NULL REFERENCES permit (id) ON DELETE CASCADE,
    document_type permit_document_type NOT NULL,
    storage_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now ()
  );

-- Create indexes
CREATE INDEX idx_permit_document_tenant_id ON permit_document (tenant_id);

CREATE INDEX idx_permit_document_permit_id ON permit_document (permit_id);

CREATE INDEX idx_permit_document_type ON permit_document (document_type);

-- Create composite index for common queries
CREATE INDEX idx_permit_document_permit_type ON permit_document (permit_id, document_type);

-- Enable RLS
ALTER TABLE permit_document ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE permit_document IS 'Supporting documents for permits (plans, contracts, clearances, etc.)';

COMMENT ON COLUMN permit_document.document_type IS 'Type of document: construction_plan, building_permit, contract, site_plan, structural_plan, electrical_plan, plumbing_plan, fire_safety_plan, environmental_clearance, barangay_clearance, proof_of_ownership, authorization_letter, other';

COMMENT ON COLUMN permit_document.storage_url IS 'Supabase storage path to the document file';

COMMENT ON COLUMN permit_document.file_name IS 'Original file name uploaded by user';

COMMENT ON COLUMN permit_document.mime_type IS 'MIME type of the file (e.g., application/pdf, image/jpeg)';

COMMENT ON COLUMN permit_document.file_size_bytes IS 'File size in bytes';