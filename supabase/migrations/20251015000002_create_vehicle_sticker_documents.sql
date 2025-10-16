-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on the following tables existing:
-- - tenant (EXISTS - created in earlier migration)
-- - vehicle_sticker (EXISTS - created in 20251015000001_create_vehicle_stickers.sql)
-- ============================================================================

-- Create document type enum
CREATE TYPE vehicle_document_type AS ENUM (
  'or',
  'cr',
  'insurance',
  'drivers_license',
  'deed_of_sale',
  'other'
);

-- Create vehicle sticker document table
CREATE TABLE IF NOT EXISTS vehicle_sticker_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vehicle_sticker_id UUID NOT NULL REFERENCES vehicle_sticker(id) ON DELETE CASCADE,
  document_type vehicle_document_type NOT NULL,
  storage_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_vehicle_sticker_document_tenant_id ON vehicle_sticker_document(tenant_id);
CREATE INDEX idx_vehicle_sticker_document_sticker_id ON vehicle_sticker_document(vehicle_sticker_id);
CREATE INDEX idx_vehicle_sticker_document_type ON vehicle_sticker_document(document_type);
CREATE INDEX idx_vehicle_sticker_document_expiry ON vehicle_sticker_document(expiry_date) WHERE expiry_date IS NOT NULL;

-- Create composite index for common queries
CREATE INDEX idx_vehicle_sticker_document_sticker_type ON vehicle_sticker_document(vehicle_sticker_id, document_type);

-- Enable RLS
ALTER TABLE vehicle_sticker_document ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE vehicle_sticker_document IS 'Supporting documents for vehicle stickers (OR, CR, insurance, etc.)';
COMMENT ON COLUMN vehicle_sticker_document.document_type IS 'Type of document: or (official receipt), cr (certificate of registration), insurance, drivers_license, deed_of_sale, other';
COMMENT ON COLUMN vehicle_sticker_document.storage_url IS 'Supabase storage path to the document file';
COMMENT ON COLUMN vehicle_sticker_document.file_name IS 'Original file name uploaded by user';
COMMENT ON COLUMN vehicle_sticker_document.mime_type IS 'MIME type of the file (e.g., application/pdf, image/jpeg)';
COMMENT ON COLUMN vehicle_sticker_document.expiry_date IS 'Nullable - expiry date for documents like insurance, registration';
