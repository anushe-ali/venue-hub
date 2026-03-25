'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import {
  addMinutesToTime,
  formatCurrency,
  formatDate,
  formatTime,
  formatRelative
} from '@/lib/utils'
import type { Booking, BookingModification } from '@/types'

interface ModificationReviewPanelProps {
  booking: Booking
  modification: BookingModification
  venue: any
  isManager: boolean
}

export default function ModificationReviewPanel({
  booking,
  modification,
  venue,
  isManager
}: ModificationReviewPanelProps) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!isManager || modification.status !== 'pending') return null

  // Check availability before approval
  const checkAvailability = async () => {
    const supabase = createClient()
    const setupStart = addMinutesToTime(modification.new_start_time!, -venue.setup_buffer_mins)
    const cleanupEnd = addMinutesToTime(modification.new_end_time!, venue.cleanup_buffer_mins)

    const { data: conflicts, error } = await supabase
      .from('bookings')
      .select('id, event_name, start_time, end_time, setup_start_time, cleanup_end_time')
      .eq('venue_id', booking.venue_id)
      .eq('event_date', modification.new_event_date)
      .in('status', ['pending', 'approved'])
      .neq('id', booking.id)

    if (error) throw error

    // Check for time overlap
    const hasConflict = conflicts?.some(b => {
      return setupStart < b.cleanup_end_time && cleanupEnd > b.setup_start_time
    })

    if (hasConflict) {
      throw new Error('The requested time slot is no longer available')
    }

    return true
  }

  const handleApprove = async () => {
    setLoading('approve')
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Re-validate availability (double-check pattern)
      await checkAvailability()

      // 2. Calculate buffer times
      const newSetupStart = addMinutesToTime(
        modification.new_start_time!,
        -venue.setup_buffer_mins
      )
      const newCleanupEnd = addMinutesToTime(
        modification.new_end_time!,
        venue.cleanup_buffer_mins
      )

      // 3. Update booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          event_date: modification.new_event_date,
          start_time: modification.new_start_time,
          end_time: modification.new_end_time,
          setup_start_time: newSetupStart,
          cleanup_end_time: newCleanupEnd,
          venue_fee: modification.new_venue_fee,
          tax_amount: modification.new_tax_amount,
          total_amount: modification.new_total_amount
        })
        .eq('id', booking.id)

      if (bookingError) throw bookingError

      // 4. Handle payment adjustment
      if (modification.cost_adjustment < 0) {
        // Cost decreased - issue refund
        await supabase.from('payments').insert({
          booking_id: booking.id,
          payer_id: booking.organizer_id,
          amount: Math.abs(modification.cost_adjustment),
          payment_type: 'refund',
          notes: 'Refund due to modification reducing total cost'
        })
      } else if (modification.cost_adjustment > 0) {
        // Cost increased - recalculate deposit
        const newDeposit = modification.new_total_amount * (venue.deposit_percent / 100)
        await supabase.from('bookings').update({
          deposit_amount: newDeposit
        }).eq('id', booking.id)
      }

      // 5. Update modification status
      const { error: modError } = await supabase
        .from('booking_modifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user.id,
          reviewer_notes: notes || null
        })
        .eq('id', modification.id)

      if (modError) throw modError

      // 6. Notify organizer
      await supabase.from('notifications').insert({
        user_id: booking.organizer_id,
        type: 'modification_approved',
        title: 'Modification Approved',
        body: `Your modification request for "${booking.event_name}" has been approved.`,
        booking_id: booking.id
      })

      // Success!
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update modification status
      const { error: modError } = await supabase
        .from('booking_modifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user.id,
          reviewer_notes: notes || null
        })
        .eq('id', modification.id)

      if (modError) throw modError

      // Notify organizer
      await supabase.from('notifications').insert({
        user_id: booking.organizer_id,
        type: 'modification_rejected',
        title: 'Modification Rejected',
        body: `Your modification request for "${booking.event_name}" was not approved. ${notes ? notes : ''}`,
        booking_id: booking.id
      })

      // Success!
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  return (
    <div className="card p-5 border-2 border-amber-100 bg-amber-50">
      <h2 className="font-semibold text-slate-900 mb-3">
        Modification Request
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Requested {formatRelative(modification.created_at)}
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Organizer's Reason */}
      <div className="rounded-lg bg-white border border-slate-200 p-3 mb-4">
        <p className="text-xs font-medium text-slate-700 mb-1">Reason:</p>
        <p className="text-sm text-slate-600">{modification.reason}</p>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Current */}
        <div className="rounded-lg bg-white border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-700 mb-2">Current:</p>
          <p className="text-sm font-medium text-slate-900">
            {formatDate(modification.old_event_date)}
          </p>
          <p className="text-sm text-slate-600">
            {formatTime(modification.old_start_time)} - {formatTime(modification.old_end_time)}
          </p>
          <p className="text-sm font-medium text-slate-900 mt-2">
            {formatCurrency(booking.total_amount)}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <ArrowRightIcon className="h-6 w-6 text-amber-500" />
        </div>

        {/* New */}
        <div className="rounded-lg bg-amber-100 border border-amber-300 p-3 col-start-2">
          <p className="text-xs font-medium text-amber-900 mb-2">Requested:</p>
          <p className="text-sm font-medium text-amber-900">
            {formatDate(modification.new_event_date!)}
          </p>
          <p className="text-sm text-amber-800">
            {formatTime(modification.new_start_time!)} - {formatTime(modification.new_end_time!)}
          </p>
          <p className="text-sm font-medium text-amber-900 mt-2">
            {formatCurrency(modification.new_total_amount)}
          </p>
        </div>
      </div>

      {/* Cost Adjustment */}
      {modification.cost_adjustment !== 0 && (
        <div className={`rounded-lg border p-3 mb-4 ${
          modification.cost_adjustment > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <p className={`text-sm font-medium ${
            modification.cost_adjustment > 0 ? 'text-red-800' : 'text-green-800'
          }`}>
            {modification.cost_adjustment > 0 ? 'Additional Charge: ' : 'Refund: '}
            {modification.cost_adjustment > 0 ? '+' : ''}
            {formatCurrency(modification.cost_adjustment)}
          </p>
          <p className={`text-xs ${
            modification.cost_adjustment > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {modification.cost_adjustment > 0
              ? 'Organizer will need to pay the additional amount'
              : 'Organizer will receive a refund for the difference'
            }
          </p>
        </div>
      )}

      {/* Manager Notes */}
      <div className="mb-4">
        <label className="label">Notes for organizer (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="input min-h-[80px] resize-none text-sm"
          placeholder="Any additional comments or conditions..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={!!loading}
          className="btn-primary btn flex-1 justify-center"
        >
          <CheckCircleIcon className="h-4 w-4" />
          {loading === 'approve' ? 'Approving…' : 'Approve Modification'}
        </button>
        <button
          onClick={handleReject}
          disabled={!!loading}
          className="btn-danger btn flex-1 justify-center"
        >
          <XCircleIcon className="h-4 w-4" />
          {loading === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
