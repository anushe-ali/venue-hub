-- ============================================================
-- Diagnostic Query - Check Bookings Data
-- ============================================================

-- Check all bookings for March 30, 2026
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

-- Check if setup/cleanup times are NULL (this would cause conflicts to be missed)
SELECT
  id,
  event_name,
  CASE
    WHEN setup_start_time IS NULL THEN 'MISSING SETUP TIME ❌'
    ELSE setup_start_time::TEXT
  END as setup_check,
  CASE
    WHEN cleanup_end_time IS NULL THEN 'MISSING CLEANUP TIME ❌'
    ELSE cleanup_end_time::TEXT
  END as cleanup_check,
  status
FROM bookings
WHERE event_date = '2026-03-30';

-- Check time format (should be HH:MM or HH:MM:SS)
SELECT
  id,
  event_name,
  setup_start_time,
  cleanup_end_time,
  LENGTH(setup_start_time::TEXT) as setup_length,
  LENGTH(cleanup_end_time::TEXT) as cleanup_length
FROM bookings
WHERE event_date = '2026-03-30';
