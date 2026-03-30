// ============================================================
// VenueHub Types
// ============================================================

export type UserRole = 'organizer' | 'manager' | 'admin'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded' | 'partially_refunded'
export type NotificationType =
  | 'booking_submitted' | 'booking_approved' | 'booking_rejected'
  | 'booking_cancelled' | 'payment_confirmed' | 'event_reminder'
  | 'modification_requested' | 'modification_approved' | 'modification_rejected'
  | 'refund_processed'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone?: string
  organization?: string
  avatar_url?: string
  billing_info: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  manager_id: string
  name: string
  venue_type: string
  description?: string
  address: string
  city: string
  state?: string
  country: string
  latitude?: number
  longitude?: number
  capacity: number
  hourly_rate: number
  full_day_rate?: number
  deposit_percent: number
  tax_percent: number
  amenities: string[]
  photos: string[]
  policies?: string
  operating_hours: OperatingHours
  setup_buffer_mins: number
  cleanup_buffer_mins: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  manager?: Profile
  layouts?: VenueLayout[]
  equipment?: VenueEquipment[]
  reviews?: Review[]
  avg_rating?: number
}

export interface OperatingHours {
  mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours
  fri: DayHours; sat: DayHours; sun: DayHours
}

export interface DayHours {
  open: string   // "08:00"
  close: string  // "22:00"
  closed?: boolean
}

export interface VenueBlackout {
  id: string
  venue_id: string
  start_date: string
  end_date: string
  reason?: string
  created_at: string
}

export interface VenueLayout {
  id: string
  venue_id: string
  name: string
  capacity: number
  description?: string
  created_at: string
}

export interface VenueEquipment {
  id: string
  venue_id: string
  name: string
  description?: string
  fee: number
  is_available: boolean
  created_at: string
}

export interface Booking {
  id: string
  venue_id: string
  organizer_id: string
  event_name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  setup_start_time: string
  cleanup_end_time: string
  expected_attendance: number
  layout_id?: string
  special_requests?: string
  status: BookingStatus
  manager_notes?: string
  venue_fee: number
  equipment_fee: number
  tax_amount: number
  total_amount: number
  deposit_amount: number
  payment_status: PaymentStatus
  cancellation_reason?: string
  cancelled_at?: string
  approved_at?: string
  rejected_at?: string
  created_at: string
  updated_at: string
  // joined
  venue?: Venue
  organizer?: Profile
  equipment?: BookingEquipment[]
  payments?: Payment[]
  messages?: Message[]
}

export interface BookingEquipment {
  id: string
  booking_id: string
  equipment_id: string
  fee_at_time: number
  equipment?: VenueEquipment
}

export interface BookingModification {
  id: string
  booking_id: string
  requested_by: string
  old_event_date: string
  old_start_time: string
  old_end_time: string
  old_venue_fee: number
  new_event_date?: string
  new_start_time?: string
  new_end_time?: string
  new_venue_fee: number
  new_tax_amount: number
  new_total_amount: number
  cost_adjustment: number
  reason: string
  status: BookingStatus
  reviewer_id?: string
  reviewed_at?: string
  reviewer_notes?: string
  created_at: string
  requested_by_profile?: Profile
}

export interface Payment {
  id: string
  booking_id: string
  payer_id: string
  amount: number
  payment_type: 'deposit' | 'balance' | 'refund'
  payment_method?: string
  reference_no?: string
  notes?: string
  created_at: string
  payer?: Profile
}

export interface Message {
  id: string
  booking_id: string
  sender_id: string
  body: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  booking_id?: string
  is_read: boolean
  created_at: string
}

export interface Review {
  id: string
  booking_id: string
  venue_id: string
  reviewer_id: string
  rating: number
  comment?: string
  created_at: string
  reviewer?: Profile
}

// ============================================================
// Form / Search Types
// ============================================================

export interface VenueSearchParams {
  city?: string
  date?: string
  capacity?: number
  venue_type?: string
  min_price?: number
  max_price?: number
  amenities?: string[]
}

export interface BookingFormData {
  event_name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  expected_attendance: number
  layout_id?: string
  equipment_ids?: string[]
  special_requests?: string
}

// ============================================================
// Admin System Types
// ============================================================

export interface AdminAuditLog {
  id: string
  admin_id: string
  action_type: string
  target_type: string
  target_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  description: string
  ip_address?: string
  user_agent?: string
  created_at: string
  admin?: Profile
}

export interface PlatformSetting {
  id: string
  key: string
  value: unknown
  category: 'fees' | 'policies' | 'payment' | 'email' | 'system'
  description?: string
  updated_by?: string
  updated_at: string
  created_at: string
  updater?: Profile
}

export interface UserActivityStat {
  id: string
  date: string
  metric: string
  value: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface AdminAnalyticsSummary {
  active_users: number
  organizer_count: number
  manager_count: number
  active_venues: number
  approved_bookings: number
  pending_bookings: number
  total_revenue: number
  revenue_last_30_days: number
  last_updated: string
}

export interface RevenueByMonth {
  month: string
  revenue: number
}

export interface UserGrowth {
  date: string
  new_users: number
}

export interface TopVenue {
  venue_id: string
  venue_name: string
  city: string
  booking_count: number
  total_revenue: number
}

export interface BookingsByStatus {
  status: BookingStatus
  count: number
}

// ============================================================
// Supabase DB type helper (simplified)
// ============================================================

export type Tables<T extends string> = {
  profiles: Profile
  venues: Venue
  bookings: Booking
  payments: Payment
  notifications: Notification
  messages: Message
  reviews: Review
  venue_equipment: VenueEquipment
  venue_layouts: VenueLayout
  venue_blackouts: VenueBlackout
  booking_equipment: BookingEquipment
  booking_modifications: BookingModification
}[T]
