-- Enhanced: create user_profile and populate auth.users.app_metadata.user_profile_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Create user_profile row
  INSERT INTO public.user_profile (auth_user_id, first_name, last_name)
  VALUES (
    NEW.id,
    '',
    ''
  ) RETURNING id INTO v_profile_id;

  -- Try to set auth.users.app_metadata.user_profile_id so JWTs can include it
  -- Use jsonb_set to safely merge into existing app_metadata. If this update
  -- fails for any reason we swallow the error to avoid breaking auth flow.
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{user_profile_id}', to_jsonb(v_profile_id::text), true)
    WHERE id = NEW.id;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'handle_new_user: failed to update auth.users.raw_app_meta_data: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger function: Auto-create residential_community_config on tenant insert
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.residential_community_config (tenant_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tenant_created
  AFTER INSERT ON tenant
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tenant();

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_role_updated_at BEFORE UPDATE ON role
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_user_updated_at BEFORE UPDATE ON tenant_user
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_household_updated_at BEFORE UPDATE ON household
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resident_updated_at BEFORE UPDATE ON resident
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_residential_community_config_updated_at BEFORE UPDATE ON residential_community_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON FUNCTION public.handle_new_user IS 'Auto-create user_profile when auth.users record created';
COMMENT ON FUNCTION public.handle_new_tenant IS 'Auto-create residential_community_config when tenant created';
COMMENT ON FUNCTION public.update_updated_at_column IS 'Update updated_at timestamp on row modification';
