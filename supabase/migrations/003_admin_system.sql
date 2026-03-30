-- ============================================================
-- ADMIN SYSTEM MIGRATION
-- ============================================================
-- This migration adds comprehensive admin functionality including:
-- - Admin audit logging for accountability
-- - Platform settings management
-- - User activity stats for analytics
-- - User activation/deactivation
-- - Analytics materialized view for performance

-- ============================================================
-- 1. ADMIN AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE admin_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action_type     TEXT NOT NULL, -- 'user_role_change', 'user_deactivate', 'user_activate', 'booking_cancel', 'settings_update', 'venue_approve', etc.
  target_type     TEXT NOT NULL, -- 'user', 'booking', 'venue', 'settings'
  target_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  description     TEXT NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_type ON admin_audit_logs(action_type);
CREATE INDEX idx_audit_target ON admin_audit_logs(target_type, target_id);

-- ============================================================
-- 2. PLATFORM SETTINGS TABLE
-- ============================================================
CREATE TABLE platform_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key             TEXT NOT NULL UNIQUE,
  value           JSONB NOT NULL,
  category        TEXT NOT NULL, -- 'fees', 'policies', 'payment', 'email', 'system'
  description     TEXT,
  updated_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settings_category ON platform_settings(category);
CREATE INDEX idx_settings_key ON platform_settings(key);

-- ============================================================
-- 3. USER ACTIVITY STATS TABLE (for analytics)
-- ============================================================
CREATE TABLE user_activity_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date            DATE NOT NULL,
  metric          TEXT NOT NULL, -- 'new_users', 'active_users', 'new_bookings', 'revenue', etc.
  value           DECIMAL(15, 2) NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, metric)
);

CREATE INDEX idx_activity_date ON user_activity_stats(date DESC);
CREATE INDEX idx_activity_metric ON user_activity_stats(metric);

-- ============================================================
-- 4. ADD IS_ACTIVE TO PROFILES
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- ============================================================
-- 5. MATERIALIZED VIEW FOR FAST ANALYTICS
-- ============================================================
CREATE MATERIALIZED VIEW admin_analytics_summary AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'organizer') as organizer_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'manager') as manager_count,
  (SELECT COUNT(*) FROM venues WHERE is_active = true) as active_venues,
  (SELECT COUNT(*) FROM bookings WHERE status = 'approved') as approved_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_type != 'refund') as total_revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_type != 'refund'
   AND created_at >= NOW() - INTERVAL '30 days') as revenue_last_30_days,
  NOW() as last_updated;

CREATE UNIQUE INDEX idx_analytics_summary ON admin_analytics_summary(last_updated);

-- ============================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- Platform Settings Policies
CREATE POLICY "Admins can view settings"
  ON platform_settings FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert settings"
  ON platform_settings FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update settings"
  ON platform_settings FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete settings"
  ON platform_settings FOR DELETE
  USING (get_user_role() = 'admin');

-- User Activity Stats Policies
CREATE POLICY "Admins can view stats"
  ON user_activity_stats FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert stats"
  ON user_activity_stats FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- Update existing profiles table policies for admin access
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- Update existing bookings table policies for admin access
CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  USING (get_user_role() = 'admin');

-- ============================================================
-- 7. ANALYTICS HELPER FUNCTIONS
-- ============================================================

-- Get revenue by month
CREATE OR REPLACE FUNCTION get_revenue_by_month(months INT)
RETURNS TABLE(month TEXT, revenue DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
    COALESCE(SUM(amount), 0)::DECIMAL as revenue
  FROM payments
  WHERE payment_type != 'refund'
    AND created_at >= NOW() - (months || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user growth by day
CREATE OR REPLACE FUNCTION get_user_growth(days INT)
RETURNS TABLE(date DATE, new_users BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*) as new_users
  FROM profiles
  WHERE created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get bookings by status
CREATE OR REPLACE FUNCTION get_bookings_by_status()
RETURNS TABLE(status booking_status, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bookings.status as status,
    COUNT(*) as count
  FROM bookings
  GROUP BY bookings.status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top venues by booking count
CREATE OR REPLACE FUNCTION get_top_venues(limit_count INT DEFAULT 10)
RETURNS TABLE(
  venue_id UUID,
  venue_name TEXT,
  city TEXT,
  booking_count BIGINT,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as venue_id,
    v.name as venue_name,
    v.city as city,
    COUNT(b.id) as booking_count,
    COALESCE(SUM(b.total_amount), 0)::DECIMAL as total_revenue
  FROM venues v
  LEFT JOIN bookings b ON v.id = b.venue_id
  WHERE v.is_active = true
  GROUP BY v.id, v.name, v.city
  ORDER BY booking_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_admin_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_analytics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. SEED DEFAULT PLATFORM SETTINGS
-- ============================================================
INSERT INTO platform_settings (key, value, category, description) VALUES
  (
    'platform_fee_percentage',
    '5'::jsonb,
    'fees',
    'Platform commission percentage on bookings'
  ),
  (
    'min_deposit_percentage',
    '30'::jsonb,
    'fees',
    'Minimum deposit required (percentage)'
  ),
  (
    'cancellation_policy',
    jsonb_build_object(
      'rules', jsonb_build_array(
        jsonb_build_object('daysBeforeEvent', 30, 'refundPercentage', 100),
        jsonb_build_object('daysBeforeEvent', 14, 'refundPercentage', 75),
        jsonb_build_object('daysBeforeEvent', 7, 'refundPercentage', 50),
        jsonb_build_object('daysBeforeEvent', 3, 'refundPercentage', 25),
        jsonb_build_object('daysBeforeEvent', 0, 'refundPercentage', 0)
      )
    ),
    'policies',
    'Default cancellation and refund policy'
  ),
  (
    'payment_methods',
    '["bank_transfer", "jazzcash", "easypaisa", "credit_card"]'::jsonb,
    'payment',
    'Enabled payment methods'
  ),
  (
    'email_booking_confirmation',
    jsonb_build_object(
      'subject', 'Booking Confirmed - {{event_name}}',
      'body', 'Dear {{organizer_name}},\n\nYour booking at {{venue_name}} has been confirmed for {{event_date}}.\n\nBooking Details:\n- Event: {{event_name}}\n- Date: {{event_date}}\n- Time: {{start_time}} - {{end_time}}\n- Total Amount: {{total_amount}}\n- Deposit Paid: {{deposit_amount}}\n\nThank you for using VenueHub!'
    ),
    'email',
    'Booking confirmation email template'
  ),
  (
    'email_booking_cancelled',
    jsonb_build_object(
      'subject', 'Booking Cancelled - {{event_name}}',
      'body', 'Dear {{organizer_name}},\n\nYour booking at {{venue_name}} for {{event_date}} has been cancelled.\n\nRefund Amount: {{refund_amount}}\n\nIf you have any questions, please contact support.'
    ),
    'email',
    'Booking cancellation email template'
  ),
  (
    'max_booking_advance_days',
    '365'::jsonb,
    'system',
    'Maximum days in advance a booking can be made'
  ),
  (
    'maintenance_mode',
    'false'::jsonb,
    'system',
    'Enable maintenance mode to prevent new bookings'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 9. ADDITIONAL INDEXES FOR ADMIN QUERIES
-- ============================================================

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_venues_active_city ON venues(is_active, city);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer_status ON bookings(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_type ON payments(booking_id, payment_type);

-- ============================================================
-- 10. AUDIT LOG CLEANUP FUNCTION
-- ============================================================

-- Function to cleanup old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM admin_audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary of changes:
-- - Created admin_audit_logs table with RLS policies
-- - Created platform_settings table with RLS policies
-- - Created user_activity_stats table with RLS policies
-- - Added is_active column to profiles table
-- - Created admin_analytics_summary materialized view
-- - Created helper functions for analytics queries
-- - Seeded default platform settings
-- - Added performance indexes for admin queries
-- - Created audit log cleanup function
