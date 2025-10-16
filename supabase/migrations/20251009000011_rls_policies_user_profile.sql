-- User Profile RLS Policies
-- Read: User can read own profile OR any user in same tenant
CREATE POLICY "user_profile_read_own_or_tenant" ON user_profile FOR
SELECT
  USING (
    auth_user_id = auth.uid ()
    OR EXISTS (
      SELECT
        1
      FROM
        tenant_user tu1
        JOIN tenant_user tu2 ON tu1.tenant_id = tu2.tenant_id
      WHERE
        tu1.user_profile_id = user_profile.id
        AND tu2.user_profile_id = public.get_current_user_profile_id ()
        AND tu1.is_active = true
        AND tu2.is_active = true
    )
  );

-- Update: User can only update their own profile
CREATE POLICY "user_profile_update_own" ON user_profile FOR
UPDATE USING (auth_user_id = auth.uid ());

-- Insert: Auto-created by trigger (service role only)
CREATE POLICY "user_profile_insert_service" ON user_profile FOR INSERT
WITH CHECK (auth.jwt () ->> 'role' = 'service_role');


-- Delete: Cascade from auth.users (service role only)
CREATE POLICY "user_profile_delete_service" ON user_profile FOR DELETE USING (auth.jwt () ->> 'role' = 'service_role');

COMMENT ON POLICY "user_profile_read_own_or_tenant" ON user_profile IS 'Users can view their own profile and profiles of users in same tenant';
