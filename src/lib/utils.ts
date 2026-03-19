import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'PKR') {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string, fmt = 'MMM d, yyyy') {
  try { return format(parseISO(dateStr), fmt) } catch { return dateStr }
}

export function formatTime(timeStr: string) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export function formatRelative(dateStr: string) {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }) } catch { return '' }
}

export function calculateBookingFee(
  startTime: string,
  endTime: string,
  hourlyRate: number,
  fullDayRate?: number
): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const hours = (eh * 60 + em - sh * 60 - sm) / 60
  if (fullDayRate && hours >= 8) return fullDayRate
  return Math.ceil(hours) * hourlyRate
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending:    'bg-amber-100 text-amber-800',
    approved:   'bg-green-100 text-green-800',
    rejected:   'bg-red-100 text-red-800',
    cancelled:  'bg-gray-100 text-gray-700',
    completed:  'bg-blue-100 text-blue-800',
    unpaid:        'bg-red-100 text-red-800',
    deposit_paid:  'bg-amber-100 text-amber-800',
    fully_paid:    'bg-green-100 text-green-800',
    refunded:      'bg-blue-100 text-blue-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export function generateTimeSlots(start = '00:00', end = '23:30', step = 30) {
  const slots: string[] = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let cur = sh * 60 + sm
  const endMins = eh * 60 + em
  while (cur <= endMins) {
    const h = Math.floor(cur / 60).toString().padStart(2, '0')
    const m = (cur % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += step
  }
  return slots
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMins = h * 60 + m + minutes
  const newH = Math.floor(totalMins / 60) % 24
  const newM = totalMins % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

export const VENUE_TYPES = [
  'Conference Hall', 'Banquet Hall', 'Wedding Venue', 'Community Center',
  'Garden / Lawn', 'Rooftop', 'Auditorium', 'Sports Complex',
  'Coworking Space', 'Studio', 'Restaurant / Private Dining', 'Other',
]

export const EVENT_TYPES = [
  'Wedding', 'Corporate Event', 'Birthday Party', 'Conference',
  'Workshop / Training', 'Exhibition', 'Concert / Performance',
  'Social Gathering', 'Religious Event', 'Sports Event', 'Other',
]

export const AMENITIES_LIST = [
  { value: 'parking',              label: 'Parking' },
  { value: 'wifi',                 label: 'WiFi' },
  { value: 'kitchen',              label: 'Kitchen' },
  { value: 'av_equipment',         label: 'AV Equipment' },
  { value: 'projector',            label: 'Projector' },
  { value: 'stage',                label: 'Stage' },
  { value: 'catering_allowed',     label: 'Catering Allowed' },
  { value: 'wheelchair_accessible',label: 'Wheelchair Accessible' },
  { value: 'outdoor_space',        label: 'Outdoor Space' },
  { value: 'ac',                   label: 'Air Conditioning' },
  { value: 'sound_system',         label: 'Sound System' },
  { value: 'security',             label: 'Security' },
]
