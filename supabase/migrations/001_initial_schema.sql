-- ============================================================
-- VenueHub Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('organizer', 'manager', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('unpaid', 'deposit_paid', 'fully_paid', 'refunded', 'partially_refunded');
CREATE TYPE notification_type AS ENUM (
  'booking_submitted', 'booking_approved', 'booking_rejected',
  'booking_cancelled', 'payment_confirmed', 'event_reminder',
  'modification_requested', 'modification_approved', 'refund_processed'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'organizer',
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  organization  TEXT,
  avatar_url    TEXT,
  billing_info  JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENUES
-- ============================================================

CREATE TABLE venues (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  venue_type       TEXT NOT NULL,
  description      TEXT,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT,
  country          TEXT NOT NULL DEFAULT 'Pakistan',
  latitude         DECIMAL(10, 8),
  longitude        DECIMAL(11, 8),
  capacity         INT NOT NULL,
  hourly_rate      DECIMAL(10, 2) NOT NULL,
  full_day_rate    DECIMAL(10, 2),
  deposit_percent  INT NOT NULL DEFAULT 30,
  tax_percent      DECIMAL(5, 2) NOT NULL DEFAULT 0,
  amenities        TEXT[] DEFAULT '{}',
  photos           TEXT[] DEFAULT '{}',
  policies         TEXT,
  operating_hours  JSONB DEFAULT '{"mon":{"open":"08:00","close":"22:00"},"tue":{"open":"08:00","close":"22:00"},"wed":{"open":"08:00","close":"22:00"},"thu":{"open":"08:00","close":"22:00"},"fri":{"open":"08:00","close":"22:00"},"sat":{"open":"09:00","close":"23:00"},"sun":{"open":"09:00","close":"20:00"}}',
  setup_buffer_mins    INT NOT NULL DEFAULT 60,
  cleanup_buffer_mins  INT NOT NULL DEFAULT 60,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENUE BLACKOUT DATES
-- ============================================================

CREATE TABLE venue_blackouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENUE LAYOUTS / SEATING CONFIGURATIONS
-- ============================================================

CREATE TABLE venue_layouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  capacity    INT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EQUIPMENT / AMENITY LINE ITEMS
-- ============================================================

CREATE TABLE venue_equipment (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  fee         DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id            UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  organizer_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  event_name          TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  event_date          DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  setup_start_time    TIME NOT NULL,
  cleanup_end_time    TIME NOT NULL,
  expected_attendance INT NOT NULL,
  layout_id           UUID REFERENCES venue_layouts(id),
  special_requests    TEXT,
  status              booking_status NOT NULL DEFAULT 'pending',
  manager_notes       TEXT,
  venue_fee           DECIMAL(10, 2) NOT NULL,
  equipment_fee       DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount        DECIMAL(10, 2) NOT NULL,
  deposit_amount      DECIMAL(10, 2) NOT NULL,
  payment_status      payment_status NOT NULL DEFAULT 'unpaid',
  cancellation_reason TEXT,
  cancelled_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKING EQUIPMENT (junction for selected equipment)
-- ============================================================

CREATE TABLE booking_equipment (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  equipment_id  UUID NOT NULL REFERENCES venue_equipment(id),
  fee_at_time   DECIMAL(10, 2) NOT NULL,
  UNIQUE(booking_id, equipment_id)
);

-- ============================================================
-- MODIFICATION REQUESTS
-- ============================================================

CREATE TABLE booking_modifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES profiles(id),
  new_event_date  DATE,
  new_start_time  TIME,
  new_end_time    TIME,
  reason          TEXT NOT NULL,
  status          booking_status NOT NULL DEFAULT 'pending',
  reviewed_at     TIMESTAMPTZ,
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  payer_id        UUID NOT NULL REFERENCES profiles(id),
  amount          DECIMAL(10, 2) NOT NULL,
  payment_type    TEXT NOT NULL DEFAULT 'deposit', -- 'deposit', 'balance', 'refund'
  payment_method  TEXT,
  reference_no    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGES (organizer <-> manager)
-- ============================================================

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES profiles(id),
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_venues_city         ON venues(city);
CREATE INDEX idx_venues_capacity     ON venues(capacity);
CREATE INDEX idx_venues_hourly_rate  ON venues(hourly_rate);
CREATE INDEX idx_venues_manager      ON venues(manager_id);
CREATE INDEX idx_venues_active       ON venues(is_active);

CREATE INDEX idx_bookings_venue      ON bookings(venue_id);
CREATE INDEX idx_bookings_organizer  ON bookings(organizer_id);
CREATE INDEX idx_bookings_date       ON bookings(event_date);
CREATE INDEX idx_bookings_status     ON bookings(status);

CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX idx_messages_booking    ON messages(booking_id);
CREATE INDEX idx_payments_booking    ON payments(booking_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_blackouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_layouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_equipment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_equipment    ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Managers/admins can view all profiles"
  ON profiles FOR SELECT USING (get_user_role() IN ('manager', 'admin'));

-- Venues: public read, manager write
CREATE POLICY "Anyone can view active venues"
  ON venues FOR SELECT USING (is_active = TRUE OR manager_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "Managers can insert venues"
  ON venues FOR INSERT WITH CHECK (manager_id = auth.uid() AND get_user_role() IN ('manager', 'admin'));
CREATE POLICY "Managers can update own venues"
  ON venues FOR UPDATE USING (manager_id = auth.uid() OR get_user_role() = 'admin');

-- Venue support tables
CREATE POLICY "Anyone can view venue blackouts"
  ON venue_blackouts FOR SELECT USING (TRUE);
CREATE POLICY "Managers manage own venue blackouts"
  ON venue_blackouts FOR ALL USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.manager_id = auth.uid())
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Anyone can view layouts"
  ON venue_layouts FOR SELECT USING (TRUE);
CREATE POLICY "Managers manage layouts"
  ON venue_layouts FOR ALL USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.manager_id = auth.uid())
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Anyone can view equipment"
  ON venue_equipment FOR SELECT USING (TRUE);
CREATE POLICY "Managers manage equipment"
  ON venue_equipment FOR ALL USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.manager_id = auth.uid())
    OR get_user_role() = 'admin'
  );

-- Bookings
CREATE POLICY "Organizers see own bookings"
  ON bookings FOR SELECT USING (organizer_id = auth.uid());
CREATE POLICY "Managers see bookings for their venues"
  ON bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.manager_id = auth.uid())
  );
CREATE POLICY "Admins see all bookings"
  ON bookings FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Organizers can create bookings"
  ON bookings FOR INSERT WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Organizers can cancel own bookings"
  ON bookings FOR UPDATE USING (organizer_id = auth.uid() AND status = 'pending');
CREATE POLICY "Managers can update bookings for their venues"
  ON bookings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.manager_id = auth.uid())
    OR get_user_role() = 'admin'
  );

-- Booking equipment
CREATE POLICY "Booking parties can view"
  ON booking_equipment FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM venues v WHERE v.id = b.venue_id AND v.manager_id = auth.uid())))
  );
CREATE POLICY "Organizers insert equipment on own bookings"
  ON booking_equipment FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.organizer_id = auth.uid())
  );

-- Modifications
CREATE POLICY "Booking parties see modifications"
  ON booking_modifications FOR SELECT USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE b.id = booking_id AND v.manager_id = auth.uid())
  );
CREATE POLICY "Organizers request modifications"
  ON booking_modifications FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Managers review modifications"
  ON booking_modifications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE b.id = booking_id AND v.manager_id = auth.uid())
  );

-- Payments
CREATE POLICY "Booking parties see payments"
  ON payments FOR SELECT USING (payer_id = auth.uid() OR get_user_role() IN ('manager','admin'));
CREATE POLICY "Organizers create payments"
  ON payments FOR INSERT WITH CHECK (payer_id = auth.uid());

-- Messages
CREATE POLICY "Booking parties see messages"
  ON messages FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM venues v WHERE v.id = b.venue_id AND v.manager_id = auth.uid())))
  );
CREATE POLICY "Booking parties send messages"
  ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Organizers review completed bookings"
  ON reviews FOR INSERT WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.organizer_id = auth.uid() AND b.status = 'completed')
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'organizer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_venues_updated     BEFORE UPDATE ON venues     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated   BEFORE UPDATE ON bookings   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent double bookings (conflict check)
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_setup_buffer INT;
  v_cleanup_buffer INT;
BEGIN
  -- Get venue buffer times
  SELECT setup_buffer_mins, cleanup_buffer_mins
  INTO v_setup_buffer, v_cleanup_buffer
  FROM venues WHERE id = NEW.venue_id;

  -- Check for overlapping approved/pending bookings on same date
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE venue_id = NEW.venue_id
      AND event_date = NEW.event_date
      AND id != COALESCE(NEW.id, uuid_generate_v4())
      AND status IN ('pending', 'approved')
      AND (
        -- New booking's window overlaps existing booking's window (including buffers)
        NEW.setup_start_time < cleanup_end_time
        AND NEW.cleanup_end_time > setup_start_time
      )
  ) THEN
    RAISE EXCEPTION 'Booking conflict: the selected time slot overlaps with an existing booking (including setup/cleanup buffers).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_conflict
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'approved'))
  EXECUTE FUNCTION check_booking_conflict();

-- Auto-create notification on booking status change
CREATE OR REPLACE FUNCTION notify_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify organizer on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, title, body, booking_id)
    VALUES (
      NEW.organizer_id,
      CASE NEW.status
        WHEN 'approved'   THEN 'booking_approved'::notification_type
        WHEN 'rejected'   THEN 'booking_rejected'::notification_type
        WHEN 'cancelled'  THEN 'booking_cancelled'::notification_type
        WHEN 'completed'  THEN 'booking_approved'::notification_type
        ELSE 'booking_submitted'::notification_type
      END,
      CASE NEW.status
        WHEN 'approved'   THEN 'Booking Approved'
        WHEN 'rejected'   THEN 'Booking Rejected'
        WHEN 'cancelled'  THEN 'Booking Cancelled'
        ELSE 'Booking Status Updated'
      END,
      'Your booking "' || NEW.event_name || '" has been ' || NEW.status || '.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_booking_change();

-- ============================================================
-- SEED DATA (demo venues, users)
-- ============================================================

-- Note: In production, seed via the Supabase dashboard or CLI.
-- Insert demo data after creating auth users through the UI.

-- Sample venue amenities reference:
-- 'parking', 'wifi', 'kitchen', 'av_equipment', 'projector',
-- 'stage', 'catering_allowed', 'wheelchair_accessible',
-- 'outdoor_space', 'ac', 'sound_system', 'security'
