-- ============================================================================
-- Add foreign key constraints for vehicle_sticker references
-- ============================================================================
-- This migration adds foreign key constraints that couldn't be added earlier
-- because the vehicle_sticker table didn't exist yet.
-- ============================================================================

-- Add foreign key constraint to gate_entry_log.vehicle_sticker_id
ALTER TABLE gate_entry_log
  ADD CONSTRAINT gate_entry_log_vehicle_sticker_id_fkey
  FOREIGN KEY (vehicle_sticker_id)
  REFERENCES vehicle_sticker(id)
  ON DELETE SET NULL;

-- Add comment
COMMENT ON CONSTRAINT gate_entry_log_vehicle_sticker_id_fkey ON gate_entry_log IS 'Foreign key to vehicle_sticker table for RFID-based entries';
