'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  CalendarDaysIcon, ClockIcon, UsersIcon, CurrencyDollarIcon,
  CheckCircleIcon, ChevronRightIcon, ChevronLeftIcon,
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency, formatTime, calculateBookingFee,
  addMinutesToTime, EVENT_TYPES, generateTimeSlots,
} from '@/lib/utils'
import type { Venue, VenueEquipment, VenueLayout } from '@/types'
import AvailabilityChecker from './AvailabilityChecker'

interface BookingFormData {
  event_name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  expected_attendance: number
  layout_id: string
  equipment_ids: string[]
  special_requests: string
}

interface BookingPageProps {
  venue: Venue & { equipment: VenueEquipment[]; layouts: VenueLayout[] }
  userId: string
}

const STEPS = ['Event Details', 'Date & Time', 'Add-ons', 'Review & Pay']

export default function BookingForm({ venue, userId }: BookingPageProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormData>({
    defaultValues: { equipment_ids: [] },
    mode: 'onChange'
  })

  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const eventDate = watch('event_date')
  const layoutId = watch('layout_id')

  // Auto-calculate setup/cleanup times
  const setupStart = startTime ? addMinutesToTime(startTime, -venue.setup_buffer_mins) : ''
  const cleanupEnd = endTime ? addMinutesToTime(endTime, venue.cleanup_buffer_mins) : ''

  // Cost calculation
  const venueFee = (startTime && endTime)
    ? calculateBookingFee(startTime, endTime, venue.hourly_rate, venue.full_day_rate ?? undefined)
    : 0
  const equipmentFee = selectedEquipment.reduce((sum, id) => {
    const eq = venue.equipment?.find(e => e.id === id)
    return sum + (eq?.fee ?? 0)
  }, 0)
  const subtotal = venueFee + equipmentFee
  const tax = subtotal * (venue.tax_percent / 100)
  const total = subtotal + tax
  const deposit = total * (venue.deposit_percent / 100)

  const toggleEquipment = (id: string) => {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
    setValue('equipment_ids', selectedEquipment.includes(id)
      ? selectedEquipment.filter(e => e !== id)
      : [...selectedEquipment, id]
    )
  }

  const onSubmit = async (data: BookingFormData) => {
    setSubmitting(true)
    setError('')
    const supabase = createClient()

    try {
      // Validate attendance against capacity
      const selectedLayout = data.layout_id ? venue.layouts.find(l => l.id === data.layout_id) : null
      const maxCapacity = selectedLayout ? selectedLayout.capacity : venue.capacity
      if (data.expected_attendance > maxCapacity) {
        throw new Error(`Expected attendance (${data.expected_attendance}) exceeds capacity (${maxCapacity})`)
      }

      // Insert booking
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          venue_id: venue.id,
          organizer_id: userId,
          event_name: data.event_name,
          event_type: data.event_type,
          event_date: data.event_date,
          start_time: data.start_time,
          end_time: data.end_time,
          setup_start_time: setupStart,
          cleanup_end_time: cleanupEnd,
          expected_attendance: data.expected_attendance,
          layout_id: data.layout_id || null,
          special_requests: data.special_requests,
          venue_fee: venueFee,
          equipment_fee: equipmentFee,
          tax_amount: tax,
          total_amount: total,
          deposit_amount: deposit,
          status: 'pending',
          payment_status: 'unpaid',
        })
        .select('id')
        .single()

      if (bookingErr) {
        // Check if it's a booking conflict error
        if (bookingErr.message?.includes('Booking conflict') ||
            bookingErr.message?.includes('overlaps')) {
          throw new Error('CONFLICT:This time slot is no longer available. Another booking was just created for this time. Please select a different date or time.')
        }
        throw bookingErr
      }

      // Insert booking equipment
      if (selectedEquipment.length > 0) {
        const equipRows = selectedEquipment.map(eqId => {
          const eq = venue.equipment.find(e => e.id === eqId)!
          return { booking_id: booking.id, equipment_id: eqId, fee_at_time: eq.fee }
        })
        await supabase.from('booking_equipment').insert(equipRows)
      }

      // Create submission notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'booking_submitted',
        title: 'Booking Submitted',
        body: `Your booking "${data.event_name}" has been submitted and is pending review.`,
        booking_id: booking.id,
      })

      router.push(`/bookings/${booking.id}?success=true`)
    } catch (err: any) {
      const errorMessage = err.message ?? 'Failed to submit booking'

      // Check if it's a conflict error
      if (errorMessage.startsWith('CONFLICT:')) {
        setError(errorMessage.replace('CONFLICT:', ''))
        // Go back to date/time step so user can select different time
        setStep(1)
      } else {
        setError(errorMessage)
      }

      setSubmitting(false)
    }
  }

  const timeSlots = generateTimeSlots('06:00', '23:00', 30)

  const canProceed = () => {
    if (step === 0) return !errors.event_name && !errors.event_type
    if (step === 1) return !!eventDate && !!startTime && !!endTime && startTime < endTime && !!watch('expected_attendance') && !errors.expected_attendance
    return true
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  i < step ? 'bg-brand-700 text-white' :
                  i === step ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? <CheckCircleIcon className="h-5 w-5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-brand-500' : 'bg-slate-200'}`} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-xs ${i === step ? 'text-brand-700 font-medium' : 'text-slate-400'}`}>{s}</span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Event Details */}
        {step === 0 && (
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Tell us about your event</h2>
            <div>
              <label className="label">Event name *</label>
              <input {...register('event_name', { required: 'Required' })} className="input" placeholder="e.g. Annual Company Dinner" />
              {errors.event_name && <p className="form-error">{errors.event_name.message}</p>}
            </div>
            <div>
              <label className="label">Event type *</label>
              <select {...register('event_type', { required: 'Required' })} className="input">
                <option value="">Select type…</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.event_type && <p className="form-error">{errors.event_type.message}</p>}
            </div>
            <div>
              <label className="label">Special requests (optional)</label>
              <textarea {...register('special_requests')} className="input min-h-[80px] resize-none" placeholder="Any special setup, dietary requirements, etc." />
            </div>
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Choose date & time</h2>
            <div>
              <label className="label">Event date *</label>
              <input
                {...register('event_date', { required: 'Required' })}
                type="date"
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.event_date && <p className="form-error">{errors.event_date.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start time *</label>
                <select {...register('start_time', { required: 'Required' })} className="input">
                  <option value="">Select…</option>
                  {timeSlots.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">End time *</label>
                <select {...register('end_time', { required: 'Required', validate: v => !startTime || v > startTime || 'Must be after start' })} className="input">
                  <option value="">Select…</option>
                  {timeSlots.filter(t => !startTime || t > startTime).map(t => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
                {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
              </div>
            </div>
            {startTime && endTime && (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-sm space-y-1.5">
                <div className="font-medium text-brand-800 mb-2">Time slot breakdown</div>
                <div className="flex justify-between text-brand-700">
                  <span>Setup starts:</span><span>{setupStart ? formatTime(setupStart) : '—'}</span>
                </div>
                <div className="flex justify-between text-brand-900 font-medium">
                  <span>Event:</span><span>{formatTime(startTime)} – {formatTime(endTime)}</span>
                </div>
                <div className="flex justify-between text-brand-700">
                  <span>Cleanup ends:</span><span>{cleanupEnd ? formatTime(cleanupEnd) : '—'}</span>
                </div>
              </div>
            )}
            {eventDate && startTime && endTime && (
              <AvailabilityChecker
                venueId={venue.id}
                eventDate={eventDate}
                startTime={startTime}
                endTime={endTime}
                setupBufferMins={venue.setup_buffer_mins}
                cleanupBufferMins={venue.cleanup_buffer_mins}
              />
            )}
            {venue.layouts?.length > 0 && (
              <div>
                <label className="label">Seating layout (optional)</label>
                <select {...register('layout_id')} className="input">
                  <option value="">No preference</option>
                  {venue.layouts.map((l: VenueLayout) => (
                    <option key={l.id} value={l.id}>{l.name} (up to {l.capacity})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Expected attendance *</label>
              <input
                {...register('expected_attendance', {
                  required: 'Required',
                  min: { value: 1, message: 'Must be at least 1' },
                  validate: (value) => {
                    const maxCap = layoutId ? venue.layouts.find(l => l.id === layoutId)?.capacity || venue.capacity : venue.capacity
                    return value <= maxCap || `Max capacity is ${maxCap}`
                  },
                  valueAsNumber: true,
                })}
                type="number" className="input" placeholder="e.g. 150"
              />
              {errors.expected_attendance && <p className="form-error">{errors.expected_attendance.message}</p>}
              <p className="text-xs text-slate-400 mt-1">Max capacity: {layoutId ? venue.layouts.find(l => l.id === layoutId)?.capacity || venue.capacity : venue.capacity}</p>
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Add equipment & services</h2>
            {!venue.equipment?.length ? (
              <p className="text-slate-500 text-sm">No additional equipment available for this venue.</p>
            ) : (
              venue.equipment.filter(e => e.is_available).map(eq => (
                <label key={eq.id} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedEquipment.includes(eq.id) ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(eq.id)}
                      onChange={() => toggleEquipment(eq.id)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                    />
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{eq.name}</div>
                      {eq.description && <div className="text-xs text-slate-500">{eq.description}</div>}
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-slate-700 shrink-0 ml-4">
                    {eq.fee > 0 ? `+${formatCurrency(eq.fee)}` : 'Free'}
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Venue</span>
                  <span className="font-medium text-slate-900">{venue.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Event</span>
                  <span className="font-medium text-slate-900">{watch('event_name')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-900">{eventDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Time</span>
                  <span className="font-medium text-slate-900">{formatTime(startTime)} – {formatTime(endTime)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Guests</span>
                  <span className="font-medium text-slate-900">{watch('expected_attendance')}</span>
                </div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Cost Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Venue fee</span><span>{formatCurrency(venueFee)}</span>
                </div>
                {equipmentFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Equipment</span><span>{formatCurrency(equipmentFee)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({venue.tax_percent}%)</span><span>{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 text-base">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-brand-700 font-medium pt-1">
                  <span>Deposit required now ({venue.deposit_percent}%)</span>
                  <span>{formatCurrency(deposit)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Your booking is pending until reviewed by the venue manager. You will be notified within 24 hours.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary btn flex-1 justify-center">
              <ChevronLeftIcon className="h-4 w-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => canProceed() && setStep(s => s + 1)}
              disabled={!canProceed()}
              className="btn-primary btn flex-1 justify-center"
            >
              Continue <ChevronRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary btn flex-1 justify-center"
            >
              {submitting ? 'Submitting…' : `Submit Booking Request · ${formatCurrency(deposit)} deposit`}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
