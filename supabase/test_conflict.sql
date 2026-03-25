-- ============================================================
-- Test Conflict Detection
-- ============================================================

-- First, check if the trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_booking_conflict';

-- Check your existing test bookings
SELECT
  id,
  event_name,
  event_date,
  start_time,
  end_time,
  setup_start_time,
  cleanup_end_time,
  status,
  created_at
FROM bookings
WHERE event_date = '2026-03-30'
ORDER BY created_at DESC;

-- To test the trigger manually, try this:
-- (This should FAIL with conflict error if trigger is working)
/*
INSERT INTO bookings (
  venue_id,
  organizer_id,
  event_name,
  event_type,
  event_date,
  start_time,
  end_time,
  setup_start_time,
  cleanup_end_time,
  expected_attendance,
  venue_fee,
  total_amount,
  deposit_amount,
  status
)
SELECT
  venue_id,
  organizer_id,
  'TEST CONFLICT',
  'test',
  event_date,
  start_time,
  end_time,
  setup_start_time,
  cleanup_end_time,
  100,
  1000.00,
  1000.00,
  300.00,
  'pending'
FROM bookings
WHERE event_date = '2026-03-30'
LIMIT 1;
*/
