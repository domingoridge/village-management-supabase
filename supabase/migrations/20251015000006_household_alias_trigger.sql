-- Trigger function: Auto-update household alias based on primary contact
CREATE OR REPLACE FUNCTION public.update_household_alias_from_primary_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_last_name VARCHAR(100);
  v_alias VARCHAR(255);
BEGIN
  -- Only process if the resident is marked as primary contact
  IF NEW.is_primary_contact = TRUE THEN
    -- Get the last_name from the linked user_profile
    SELECT up.last_name INTO v_last_name
    FROM tenant_user tu
    JOIN user_profile up ON up.id = tu.user_profile_id
    WHERE tu.id = NEW.tenant_user_id;

    -- Construct the alias: "{last_name} Residence"
    -- Handle empty/null last_name
    IF v_last_name IS NOT NULL AND v_last_name != '' THEN
      v_alias := v_last_name || ' Residence';
    ELSE
      v_alias := 'Residence';
    END IF;

    -- Update the household alias
    UPDATE household
    SET alias = v_alias
    WHERE id = NEW.household_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on resident table
CREATE TRIGGER update_household_alias_on_primary_contact
  AFTER INSERT OR UPDATE ON resident
  FOR EACH ROW
  EXECUTE FUNCTION public.update_household_alias_from_primary_contact();

COMMENT ON FUNCTION public.update_household_alias_from_primary_contact IS 'Auto-update household alias based on primary contact last name';
