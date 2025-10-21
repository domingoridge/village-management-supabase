-- ============================================================================
-- STORAGE BUCKET AND RLS POLICIES FOR PERMIT DOCUMENTS
-- ============================================================================
-- This migration creates a private storage bucket for permit documents
-- (construction plans, building permits, contracts, clearances, etc.) and sets up RLS
-- policies that mirror the database table policies for consistent access control.
-- ============================================================================

-- ============================================================================
-- MIGRATION DEPENDENCIES
-- ============================================================================
-- This migration depends on:
-- - storage.buckets table (Supabase built-in)
-- - storage.objects table (Supabase built-in)
-- - tenant table (created in earlier migration)
-- - permit table (created in 20251013000021_create_permits.sql)
-- - permit_document table (created in 20251020000011_create_permit_documents.sql)
-- - RLS policies on permit_document (created in 20251020000012_rls_policies_permit_document.sql)
-- ============================================================================

-- Create storage bucket for permit documents
-- Bucket is private by default (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'permit-documents',
  'permit-documents',
  false, -- Private bucket, access controlled by RLS
  52428800, -- 50MB max file size (larger than vehicle docs for plans/blueprints)
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/dwg',
    'image/vnd.dwg',
    'application/x-dwg'
  ]
);

-- Note: RLS is already enabled on storage.objects by Supabase
-- We only need to create our policies below

-- ============================================================================
-- STORAGE RLS POLICY: SELECT (Download/View)
-- ============================================================================
-- All tenant users can view/download permit documents in their tenant
-- This extracts tenant_id directly from the storage path structure: {tenant_id}/{filename}
CREATE POLICY "permit_storage_select_tenant" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'permit-documents' AND
    -- Extract tenant_id from the first part of the path and compare with current user's tenant
    split_part(storage.objects.name, '/', 1)::uuid = public.get_current_tenant_id()
  );

-- ============================================================================
-- STORAGE RLS POLICY: INSERT (Upload)
-- ============================================================================
-- Admin users and permit requesters can upload documents
-- Note: The storage path should follow the pattern: {tenant_id}/{filename}
-- The application must validate permit_id belongs to the user before upload
CREATE POLICY "permit_storage_insert_admin_or_requester" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'permit-documents' AND
    (
      -- Admins can upload documents for any permit
      EXISTS (
        SELECT 1 FROM tenant_user tu
        JOIN role r ON r.id = tu.role_id
        WHERE tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.tenant_id = public.get_current_tenant_id()
        AND tu.is_active = true
        AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
      )
      -- OR permit requester (application must ensure path contains their permit_id)
      -- Since we can't validate the permit_id during INSERT (document doesn't exist yet),
      -- we allow permit requesters to upload and rely on application-level validation
      OR EXISTS (
        SELECT 1 FROM tenant_user tu
        JOIN resident res ON res.tenant_user_id = tu.id
        WHERE tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.tenant_id = public.get_current_tenant_id()
        AND tu.is_active = true
      )
    )
  );

-- ============================================================================
-- STORAGE RLS POLICY: UPDATE
-- ============================================================================
-- Admin users and permit requesters can update documents
CREATE POLICY "permit_storage_update_admin_or_requester" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'permit-documents' AND
    (
      -- Admins can update any document
      EXISTS (
        SELECT 1 FROM tenant_user tu
        JOIN role r ON r.id = tu.role_id
        WHERE tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.tenant_id = public.get_current_tenant_id()
        AND tu.is_active = true
        AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
      )
      -- OR permit requester can update documents for their permits
      OR EXISTS (
        SELECT 1
        FROM permit_document pd
        JOIN permit p ON p.id = pd.permit_id
        JOIN tenant_user tu ON tu.id = p.requested_by
        WHERE pd.storage_url = storage.objects.name
        AND tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.is_active = true
      )
    )
  );

-- ============================================================================
-- STORAGE RLS POLICY: DELETE
-- ============================================================================
-- Only admin users can delete permit documents
CREATE POLICY "permit_storage_delete_admin" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'permit-documents' AND
    EXISTS (
      SELECT 1
      FROM permit_document pd
      WHERE pd.storage_url = storage.objects.name
      AND pd.tenant_id = public.get_current_tenant_id()
      AND EXISTS (
        SELECT 1 FROM tenant_user tu
        JOIN role r ON r.id = tu.role_id
        WHERE tu.user_profile_id = (
          SELECT id FROM user_profile WHERE auth_user_id = auth.uid()
        )
        AND tu.tenant_id = public.get_current_tenant_id()
        AND tu.is_active = true
        AND r.code IN ('superadmin', 'admin-head', 'admin-officers')
      )
    )
  );

-- ============================================================================
-- STORAGE PATH STRUCTURE
-- ============================================================================
-- Recommended storage path structure for uploaded files in the 'permit-documents' bucket:
-- {tenant_id}/{filename}
--
-- Where filename should include document type and timestamp for uniqueness:
-- {document_type}_{timestamp}_{original_filename}
--
-- Example:
-- 123e4567-e89b-12d3-a456-426614174000/construction_plan_1697123456_blueprint.pdf
--
-- This structure:
-- 1. Bucket name 'permit-documents' identifies the document category
-- 2. Ensures tenant isolation at the path level
-- 3. Prevents filename collisions with timestamp prefix in filename
-- 4. Makes it easy to query and manage documents
-- ============================================================================

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
-- Application Layer Responsibilities:
-- 1. Before upload, validate the user has permission for the permit_id
-- 2. Construct the storage path following the pattern: {tenant_id}/{filename}
-- 3. Ensure filename includes document type and timestamp for uniqueness
-- 4. After successful upload, create the permit_document record with storage_url
-- 5. Before delete, remove the permit_document record first (or use CASCADE)
--
-- Example workflow:
-- 1. User uploads file via Supabase Storage API to bucket 'permit-documents' with path: 123e4567-e89b-12d3-a456-426614174000/construction_plan_1697123456_blueprint.pdf
-- 2. Storage RLS policy validates user permission
-- 3. File is stored in bucket with constructed path
-- 4. Application creates permit_document record with storage_url pointing to the file
-- 5. Future downloads use the storage_url from the database record
-- ============================================================================
