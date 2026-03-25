'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilSquareIcon, XMarkIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import {
  calculateBookingFee,
  addMinutesToTime,
  generateTimeSlots,
  formatCurrency,
  formatDate,
  formatTime
} from '@/lib/utils'
import type { Booking } from '@/types'

interface ModificationRequestFormProps {
  booking: Booking
  venue: any
  organizer: any
}

export default function ModificationRequestForm({ booking, venue, organizer }: ModificationRequestFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [newEventDate, setNewEventDate] = useState(booking.event_date)
  const [newStartTime, setNewStartTime] = useState(booking.start_time)
  const [newEndTime, setNewEndTime] = useState(booking.end_time)
  const [reason, setReason] = useState('')

  // Check if modification is allowed
  const canModify = () => {
    // TEMPORARY: Allow modifications on both pending and approved bookings for testing
    if (!['pending', 'approved'].includes(booking.status)) {
      return { allowed: false, reason: 'Only pending or approved bookings can be modified' }
    }
    // TEMPORARILY DISABLED 48-hour check for testing
    // const eventDate = new Date(booking.event_date)
    // const now = new Date()
    // const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    // if (hoursUntil < 48) return { allowed: false, reason: 'Modifications must be requested at least 48 hours before the event' }
    return { allowed: true, reason: '' }
  }

  const modifyCheck = canModify()

  // Calculate new costs in real-time
  const calculateNewCosts = () => {
    const newVenueFee = calculateBookingFee(
      newStartTime,
      newEndTime,
      venue.hourly_rate,
      venue.full_day_rate
    )
    const subtotal = newVenueFee + booking.equipment_fee
    const newTax = subtotal * (venue.tax_percent / 100)
    const newTotal = subtotal + newTax
    const costAdjustment = newTotal - booking.total_amount

    return { newVenueFee, newTax, newTotal, costAdjustment }
  }

  const costs = calculateNewCosts()

  // Check availability
  const checkAvailability = async () => {
    const supabase = createClient()
    const setupStart = addMinutesToTime(newStartTime, -venue.setup_buffer_mins)
    const cleanupEnd = addMinutesToTime(newEndTime, venue.cleanup_buffer_mins)

    const { data: conflicts, error } = await supabase
      .from('bookings')
      .select('id, event_name, start_time, end_time, setup_start_time, cleanup_end_time')
      .eq('venue_id', booking.venue_id)
      .eq('event_date', newEventDate)
      .in('status', ['pending', 'approved'])
      .neq('id', booking.id)

    if (error) throw error

    // Check for time overlap
    const hasConflict = conflicts?.some(b => {
      // Overlap check: new booking's window overlaps existing booking's window
      return setupStart < b.cleanup_end_time && cleanupEnd > b.setup_start_time
    })

    if (hasConflict) {
      throw new Error('The selected time slot conflicts with another booking')
    }

    return true
  }

  // Submit modification request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Check for existing pending modification
      const { data: existing } = await supabase
        .from('booking_modifications')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('status', 'pending')

      if (existing?.length) {
        throw new Error('A pending modification request already exists for this booking')
      }

      // 2. Validate availability
      await checkAvailability()

      // 3. Calculate costs
      const { newVenueFee, newTax, newTotal, costAdjustment } = costs

      // 4. Create modification request
      const { error: modError } = await supabase
        .from('booking_modifications')
        .insert({
          booking_id: booking.id,
          requested_by: user.id,
          old_event_date: booking.event_date,
          old_start_time: booking.start_time,
          old_end_time: booking.end_time,
          old_venue_fee: booking.venue_fee,
          new_event_date: newEventDate,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
          new_venue_fee: newVenueFee,
          new_tax_amount: newTax,
          new_total_amount: newTotal,
          cost_adjustment: costAdjustment,
          reason: reason,
          status: 'pending'
        })
        .select()
        .single()

      if (modError) throw modError

      // 5. Notify venue manager
      await supabase.from('notifications').insert({
        user_id: venue.manager_id,
        type: 'modification_requested',
        title: 'Modification Request',
        body: `${organizer.full_name} requested to modify "${booking.event_name}" from ${formatDate(booking.event_date)} to ${formatDate(newEventDate)}`,
        booking_id: booking.id
      })

      // Success!
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Generate time slots
  const timeSlots = generateTimeSlots('06:00', '23:00', 30)
  const endTimeSlots = timeSlots.filter(t => t > newStartTime)

  // Get minimum date (today + 2 days for 48 hour buffer)
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 2)
  const minDateStr = minDate.toISOString().split('T')[0]

  if (!modifyCheck.allowed) {
    return null
  }

  return (
    <div className="card p-5">
      <h3 className="font-medium text-slate-900 mb-2">Request Modification</h3>
      <p className="text-xs text-slate-500 mb-3">
        Need to change the date or time? Submit a modification request for manager approval.
      </p>

      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="btn-secondary btn btn-sm w-full justify-center"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Request Date/Time Change
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Current Details */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-medium text-slate-700 mb-2">Current Details:</p>
            <p className="text-sm text-slate-600">
              {formatDate(booking.event_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {formatCurrency(booking.total_amount)}
            </p>
          </div>

          {/* New Date */}
          <div>
            <label className="label">
              <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
              New Event Date
            </label>
            <input
              type="date"
              value={newEventDate}
              onChange={e => setNewEventDate(e.target.value)}
              min={minDateStr}
              required
              className="input"
            />
          </div>

          {/* New Start Time */}
          <div>
            <label className="label">
              <ClockIcon className="h-4 w-4 text-slate-400" />
              New Start Time
            </label>
            <select
              value={newStartTime}
              onChange={e => setNewStartTime(e.target.value)}
              required
              className="input"
            >
              {timeSlots.map(t => (
                <option key={t} value={t}>{formatTime(t)}</option>
              ))}
            </select>
          </div>

          {/* New End Time */}
          <div>
            <label className="label">
              <ClockIcon className="h-4 w-4 text-slate-400" />
              New End Time
            </label>
            <select
              value={newEndTime}
              onChange={e => setNewEndTime(e.target.value)}
              required
              className="input"
            >
              {endTimeSlots.map(t => (
                <option key={t} value={t}>{formatTime(t)}</option>
              ))}
            </select>
          </div>

          {/* Cost Comparison */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs font-medium text-blue-900 mb-2">Cost Comparison:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>New venue fee:</span>
                <span>{formatCurrency(costs.newVenueFee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Equipment fee:</span>
                <span>{formatCurrency(booking.equipment_fee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span>{formatCurrency(costs.newTax)}</span>
              </div>
              <div className="flex justify-between font-medium text-slate-900 pt-1 border-t border-blue-200">
                <span>New total:</span>
                <span>{formatCurrency(costs.newTotal)}</span>
              </div>
              <div className={`flex justify-between font-bold pt-1 ${
                costs.costAdjustment > 0 ? 'text-red-600' : costs.costAdjustment < 0 ? 'text-green-600' : 'text-slate-600'
              }`}>
                <span>Difference:</span>
                <span>
                  {costs.costAdjustment > 0 ? '+' : ''}{formatCurrency(costs.costAdjustment)}
                  {costs.costAdjustment > 0 && ' (additional charge)'}
                  {costs.costAdjustment < 0 && ' (refund)'}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="label">Reason for modification (required)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              className="input min-h-[80px] resize-none text-sm"
              placeholder="Please explain why you need to modify the booking..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setError('')
              }}
              disabled={loading}
              className="btn-secondary btn flex-1 justify-center"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="btn-primary btn flex-1 justify-center"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
