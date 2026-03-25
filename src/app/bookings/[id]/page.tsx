import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  formatCurrency, formatDate, formatTime, formatRelative, getStatusColor
} from '@/lib/utils'
import {
  ArrowLeftIcon, BuildingOffice2Icon, CalendarDaysIcon,
  ClockIcon, UsersIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon,
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline'
import BookingActions from '@/components/bookings/BookingActions'
import MessageThread from '@/components/bookings/MessageThread'
import PaymentPanel from '@/components/payments/PaymentPanel'

export default async function BookingDetailPage({
  params, searchParams
}: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
  const { id } = await params
  const query = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      venue:venues(*, manager:profiles(full_name, email)),
      organizer:profiles!organizer_id(full_name, email, phone, organization),
      equipment:booking_equipment(*, equipment:venue_equipment(name, description)),
      payments(*),
      messages(*, sender:profiles(full_name, avatar_url))
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  // Authorization check
  const isOrganizer = booking.organizer_id === user.id
  const isManager = (booking.venue as any)?.manager_id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isOrganizer && !isManager && !isAdmin) redirect('/dashboard')

  const venue = booking.venue as any
  const organizer = booking.organizer as any
  const payments = (booking.payments ?? []) as any[]
  const messages = ((booking.messages ?? []) as any[]).sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const equipment = (booking.equipment ?? []) as any[]

  const totalPaid = payments.filter((p: any) => p.payment_type !== 'refund').reduce((s: number, p: any) => s + p.amount, 0)
  const totalRefunded = payments.filter((p: any) => p.payment_type === 'refund').reduce((s: number, p: any) => s + p.amount, 0)
  const balance = booking.total_amount - totalPaid + totalRefunded

  return (
    <div className="max-w-5xl mx-auto">
      {/* Success banner */}
      {query.success && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800">Booking submitted successfully!</p>
            <p className="text-sm text-green-600">The venue manager will review your request and respond within 24 hours.</p>
          </div>
        </div>
      )}

      {/* Back */}
      <Link
        href={isManager ? '/manager/dashboard' : '/bookings'}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {isManager ? 'Back to booking queue' : 'Back to my bookings'}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{booking.event_name}</h1>
          <p className="text-slate-500 text-sm mt-1">{booking.event_type} · Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`badge text-sm px-3 py-1 ${getStatusColor(booking.status)}`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
          <span className={`badge text-xs ${getStatusColor(booking.payment_status)}`}>
            {booking.payment_status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Main details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Venue */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BuildingOffice2Icon className="h-5 w-5 text-slate-400" /> Venue
            </h2>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {venue?.photos?.[0]
                  ? <img src={venue.photos[0]} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-2xl">🏢</div>
                }
              </div>
              <div>
                <Link href={`/venues/${venue?.id}`} className="font-semibold text-brand-700 hover:text-brand-800">{venue?.name}</Link>
                <p className="text-sm text-slate-500">{venue?.address}, {venue?.city}</p>
                <p className="text-xs text-slate-400 mt-1">Manager: {venue?.manager?.full_name}</p>
              </div>
            </div>
          </div>

          {/* Event details */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Event Details</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                { Icon: CalendarDaysIcon, label: 'Date', value: formatDate(booking.event_date) },
                { Icon: ClockIcon, label: 'Event time', value: `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` },
                { Icon: ClockIcon, label: 'Setup starts', value: formatTime(booking.setup_start_time) },
                { Icon: ClockIcon, label: 'Cleanup ends', value: formatTime(booking.cleanup_end_time) },
                { Icon: UsersIcon, label: 'Attendance', value: `${booking.expected_attendance} guests` },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500">{label}:</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-1">Special requests</p>
                <p className="text-sm text-slate-700">{booking.special_requests}</p>
              </div>
            )}
          </div>

          {/* Equipment */}
          {equipment.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Selected Equipment</h2>
              <div className="space-y-2">
                {equipment.map((eq: any) => (
                  <div key={eq.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{eq.equipment?.name}</span>
                    <span className="font-medium">{formatCurrency(eq.fee_at_time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organizer info (for managers) */}
          {(isManager || isAdmin) && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Organizer</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-500">Name:</span> <span className="font-medium">{organizer?.full_name}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{organizer?.email}</span></div>
                {organizer?.phone && <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{organizer.phone}</span></div>}
                {organizer?.organization && <div><span className="text-slate-500">Organization:</span> <span className="font-medium">{organizer.organization}</span></div>}
              </div>
            </div>
          )}

          {/* Actions (manager) */}
          {(isManager || isAdmin) && (
            <BookingActions
              booking={booking as any}
              isManager={isManager}
            />
          )}

          {/* Messages */}
          <MessageThread
            bookingId={booking.id}
            messages={messages}
            currentUserId={user.id}
          />
        </div>

        {/* Right: Payment panel */}
        <div className="space-y-5">
          {/* Cost summary */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-slate-400" /> Payment Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Venue fee</span><span>{formatCurrency(booking.venue_fee)}</span>
              </div>
              {booking.equipment_fee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Equipment</span><span>{formatCurrency(booking.equipment_fee)}</span>
                </div>
              )}
              {booking.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span><span>{formatCurrency(booking.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span><span>{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Deposit</span><span>{formatCurrency(booking.deposit_amount)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-medium">
                <span>Paid</span><span>{formatCurrency(totalPaid)}</span>
              </div>
              {totalRefunded > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Refunded</span><span>{formatCurrency(totalRefunded)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Balance due</span><span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>

          {/* Payment action */}
          {isOrganizer && booking.status === 'approved' && balance > 0 && (
            <PaymentPanel
              booking={booking as any}
              balance={balance}
              totalPaid={totalPaid}
            />
          )}

          {/* Manager notes */}
          {booking.manager_notes && (
            <div className="card p-5 bg-blue-50 border-blue-100">
              <p className="text-xs font-medium text-blue-600 mb-1">Manager notes</p>
              <p className="text-sm text-blue-800">{booking.manager_notes}</p>
            </div>
          )}

          {/* Cancellation (organizer) */}
          {isOrganizer && ['pending', 'approved'].includes(booking.status) && (
            <div className="card p-5">
              <h3 className="font-medium text-slate-900 mb-2">Cancel Booking</h3>
              <p className="text-xs text-slate-500 mb-3">
                Cancellation refunds are based on the venue&apos;s policy and the cancellation date.
              </p>
              <Link href={`/bookings/${booking.id}/cancel`} className="btn-danger btn btn-sm w-full justify-center">
                <XCircleIcon className="h-4 w-4" /> Cancel Booking
              </Link>
            </div>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Payment History</h3>
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="capitalize font-medium text-slate-700">{p.payment_type}</span>
                      <p className="text-xs text-slate-400">{formatRelative(p.created_at)}</p>
                    </div>
                    <span className={`font-semibold ${p.payment_type === 'refund' ? 'text-blue-600' : 'text-green-600'}`}>
                      {p.payment_type === 'refund' ? '-' : '+'}{formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
