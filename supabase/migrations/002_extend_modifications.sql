-- ============================================================
-- Migration: Extend booking_modifications table
-- Description: Add cost tracking and old values for modification workflow
-- ============================================================

-- Add cost tracking and old values for comparison
ALTER TABLE booking_modifications
  ADD COLUMN old_event_date DATE,
  ADD COLUMN old_start_time TIME,
  ADD COLUMN old_end_time TIME,
  ADD COLUMN old_venue_fee DECIMAL(10, 2),
  ADD COLUMN new_venue_fee DECIMAL(10, 2),
  ADD COLUMN new_tax_amount DECIMAL(10, 2),
  ADD COLUMN new_total_amount DECIMAL(10, 2),
  ADD COLUMN cost_adjustment DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN reviewer_id UUID REFERENCES profiles(id);

-- Add indexes for performance
CREATE INDEX idx_modifications_booking ON booking_modifications(booking_id);
CREATE INDEX idx_modifications_status ON booking_modifications(status);

-- Add comment
COMMENT ON TABLE booking_modifications IS 'Stores modification requests for approved bookings with cost tracking';
