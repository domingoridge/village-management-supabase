-- ============================================================================
-- ADD FORM_ANSWERS COLUMN TO PERMIT TABLE
-- ============================================================================
-- This migration adds a form_answers jsonb column to store dynamic form data
-- ============================================================================

-- Add form_answers column to permit table
ALTER TABLE permit ADD COLUMN form_answers JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for form_answers JSONB for efficient querying
CREATE INDEX idx_permit_form_answers ON permit USING GIN (form_answers);

-- Add helpful comment
COMMENT ON COLUMN permit.form_answers IS 'Dynamic form answers collected during permit application (questions, responses, etc.)';
