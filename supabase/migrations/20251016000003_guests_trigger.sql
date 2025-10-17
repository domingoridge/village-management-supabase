-- ============================================================================
-- Triggers for Guests Table
-- ============================================================================

-- Apply updated_at trigger to guests table
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER update_guests_updated_at ON guests IS 'Automatically update updated_at timestamp on row modification';
