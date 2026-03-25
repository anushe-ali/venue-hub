-- ============================================================
-- Fix Booking Conflict Detection Trigger
-- ============================================================

-- First, drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trg_booking_conflict ON bookings;
DROP FUNCTION IF EXISTS check_booking_conflict();

-- Recreate the conflict detection function
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict_count INT;
BEGIN
  -- Check for overlapping approved/pending bookings on same date and venue
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE venue_id = NEW.venue_id
    AND event_date = NEW.event_date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status IN ('pending', 'approved')
    AND (
      -- Overlap detection: new booking's window overlaps existing booking's window
      NEW.setup_start_time < cleanup_end_time
      AND NEW.cleanup_end_time > setup_start_time
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: the selected time slot overlaps with an existing booking (including setup/cleanup buffers).';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trg_booking_conflict
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'approved'))
  EXECUTE FUNCTION check_booking_conflict();

-- Test query to verify the trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_booking_conflict';
