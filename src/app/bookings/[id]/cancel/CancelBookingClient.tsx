'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CancelBookingClientProps {
  booking: any
  refundCalculation: {
    refundAmount: number
    refundPercentage: number
    daysUntilEvent: number
    policyRule: string
  }
  totalPaid: number
  policyText: string
}

export default function CancelBookingClient({
  booking,
  refundCalculation,
  totalPaid,
  policyText
}: CancelBookingClientProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { refundAmount, refundPercentage, daysUntilEvent, policyRule } = refundCalculation
  const venue = booking.venue as any

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a cancellation reason')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // 1. Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', booking.id)

      if (bookingError) {
        console.error('Booking update error:', bookingError)
        throw new Error(`Failed to cancel booking: ${bookingError.message}`)
      }

      // 2. Process refund if applicable
      if (refundAmount > 0) {
        // Create refund payment record
        const { error: refundError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            payer_id: booking.organizer_id,
            amount: refundAmount,
            payment_type: 'refund',
            notes: `${policyRule} - Cancellation reason: ${reason}`,
          })

        if (refundError) {
          console.error('Refund creation error:', refundError)
          throw new Error(`Failed to create refund: ${refundError.message}`)
        }

        // Update payment status
        const newPaymentStatus = refundAmount >= totalPaid ? 'refunded' : 'partially_refunded'
        await supabase
          .from('bookings')
          .update({ payment_status: newPaymentStatus })
          .eq('id', booking.id)
      }

      // 3. Notify venue manager
      await supabase.from('notifications').insert({
        user_id: venue.manager_id,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        body: `"${booking.event_name}" on ${formatDate(booking.event_date)} has been cancelled by the organizer. Refund: ${formatCurrency(refundAmount)}`,
        booking_id: booking.id
      })

      // 4. Notify organizer (confirmation)
      await supabase.from('notifications').insert({
        user_id: booking.organizer_id,
        type: 'booking_cancelled',
        title: 'Cancellation Confirmed',
        body: `Your booking "${booking.event_name}" has been cancelled. ${refundAmount > 0 ? `Refund of ${formatCurrency(refundAmount)} will be processed.` : 'No refund applicable.'}`,
        booking_id: booking.id
      })

      // Success - redirect to booking detail
      router.push(`/bookings/${booking.id}`)
      router.refresh()
    } catch (err: any) {
      console.error('Cancellation error:', err)
      setError(err.message || 'An error occurred during cancellation')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href={`/bookings/${booking.id}`}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back to booking
      </Link>

      <div className="card p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Cancel Booking</h1>
            <p className="text-sm text-slate-500">{booking.event_name}</p>
            <p className="text-xs text-slate-400">{formatDate(booking.event_date)} • {venue.name}</p>
          </div>
        </div>

        {/* Refund Information */}
        <div className="space-y-4 mb-6">
          {/* Refund Summary */}
          <div className={`rounded-xl border p-4 ${
            refundAmount > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <InformationCircleIcon className={`h-5 w-5 mt-0.5 ${
                refundAmount > 0 ? 'text-green-600' : 'text-red-600'
              }`} />
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${
                  refundAmount > 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {refundAmount > 0 ? 'Refund Eligible' : 'No Refund Available'}
                </p>
                <p className={`text-sm mb-2 ${
                  refundAmount > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {policyRule}
                </p>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className={refundAmount > 0 ? 'text-green-600' : 'text-red-600'}>
                      Days until event:
                    </span>
                    <span className={`font-medium ${refundAmount > 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {daysUntilEvent} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={refundAmount > 0 ? 'text-green-600' : 'text-red-600'}>
                      Total paid:
                    </span>
                    <span className={`font-medium ${refundAmount > 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className={`font-semibold ${refundAmount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Refund amount ({refundPercentage}%):
                    </span>
                    <span className={`font-bold text-lg ${refundAmount > 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {formatCurrency(refundAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <details className="rounded-lg border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
              View Cancellation Policy
            </summary>
            <div className="mt-3 text-sm text-slate-600 whitespace-pre-line">
              {policyText}
            </div>
          </details>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Cancellation reason */}
        <div className="mb-6">
          <label className="label">
            Reason for cancellation <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="input min-h-[120px] resize-none"
            placeholder="Please explain why you need to cancel this booking..."
            disabled={loading}
          />
          <p className="text-xs text-slate-500 mt-1">
            This will be shared with the venue manager.
          </p>
        </div>

        {/* Warning */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-6 text-sm text-amber-800">
          <p className="font-medium mb-1">⚠️ This action cannot be undone</p>
          <p>Once cancelled, your booking will be permanently cancelled and the venue slot will be freed.</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link
            href={`/bookings/${booking.id}`}
            className="btn-secondary btn flex-1 justify-center"
          >
            Keep Booking
          </Link>
          <button
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
            className="btn-danger btn flex-1 justify-center"
          >
            {loading ? 'Cancelling…' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}
