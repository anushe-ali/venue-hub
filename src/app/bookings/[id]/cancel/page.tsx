import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateRefundAmount, getCancellationPolicyText } from '@/lib/refundCalculator'
import CancelBookingClient from './CancelBookingClient'

export default async function CancelBookingPage({
  params
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch booking with venue and payments
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      *,
      venue:venues(id, name, manager_id, manager:profiles(full_name, email)),
      payments(*)
    `)
    .eq('id', id)
    .single()

  if (bookingError) {
    console.error('Booking fetch error:', bookingError)
    notFound()
  }

  if (!booking) notFound()

  // Authorization: Only organizer can cancel
  if (booking.organizer_id !== user.id) {
    redirect(`/bookings/${id}`)
  }

  // Only allow cancellation for pending or approved bookings
  if (!['pending', 'approved'].includes(booking.status)) {
    redirect(`/bookings/${id}`)
  }

  // Calculate total paid
  const payments = (booking.payments ?? []) as any[]
  const totalPaid = payments
    .filter((p: any) => p.payment_type !== 'refund')
    .reduce((sum: number, p: any) => sum + p.amount, 0)

  // Calculate refund based on cancellation policy
  const refundCalculation = calculateRefundAmount(booking.event_date, totalPaid)

  // Get policy text for display
  const policyText = getCancellationPolicyText()

  return (
    <CancelBookingClient
      booking={booking}
      refundCalculation={refundCalculation}
      totalPaid={totalPaid}
      policyText={policyText}
    />
  )
}
