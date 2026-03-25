'use client'

import { useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { addMinutesToTime } from '@/lib/utils'

interface AvailabilityCheckerProps {
  venueId: string
  eventDate: string
  startTime: string
  endTime: string
  setupBufferMins: number
  cleanupBufferMins: number
}

export default function AvailabilityChecker({
  venueId,
  eventDate,
  startTime,
  endTime,
  setupBufferMins,
  cleanupBufferMins
}: AvailabilityCheckerProps) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{
    available: boolean
    message: string
    conflictingBooking?: any
  } | null>(null)

  // Helper to normalize time strings for comparison (handles HH:MM and HH:MM:SS)
  const normalizeTime = (time: string): string => {
    if (!time) return ''
    // Remove seconds if present (HH:MM:SS -> HH:MM)
    return time.substring(0, 5)
  }

  // Helper to compare times (returns true if time1 < time2)
  const isTimeBefore = (time1: string, time2: string): boolean => {
    const t1 = normalizeTime(time1)
    const t2 = normalizeTime(time2)
    return t1 < t2
  }

  const checkAvailability = async () => {
    setChecking(true)
    setResult(null)

    try {
      const supabase = createClient()

      // Calculate buffer times
      const setupStart = addMinutesToTime(startTime, -setupBufferMins)
      const cleanupEnd = addMinutesToTime(endTime, cleanupBufferMins)

      console.log('Checking availability:', {
        venueId,
        eventDate,
        setupStart,
        cleanupEnd,
        startTime,
        endTime
      })

      // Call RPC function that bypasses RLS to check all bookings
      const { data: conflicts, error } = await supabase.rpc('check_slot_availability', {
        p_venue_id: venueId,
        p_event_date: eventDate,
        p_setup_start: setupStart,
        p_cleanup_end: cleanupEnd,
        p_exclude_booking_id: null
      })

      if (error) {
        console.error('RPC error:', error)
        throw error
      }

      console.log('Conflict check result:', conflicts)

      // The RPC returns an array with conflict details, or empty array if no conflict
      const conflict = conflicts && conflicts.length > 0 ? conflicts[0] : null

      if (conflict) {
        setResult({
          available: false,
          message: `Time slot conflicts with "${conflict.conflicting_event_name}" (${normalizeTime(conflict.conflicting_start_time)} - ${normalizeTime(conflict.conflicting_end_time)})`,
          conflictingBooking: conflict
        })
      } else {
        setResult({
          available: true,
          message: 'Time slot is available!'
        })
      }
    } catch (err: any) {
      setResult({
        available: false,
        message: `Error checking availability: ${err.message}`
      })
    } finally {
      setChecking(false)
    }
  }

  // Auto-check when component mounts or inputs change
  // useEffect(() => {
  //   if (venueId && eventDate && startTime && endTime) {
  //     checkAvailability()
  //   }
  // }, [venueId, eventDate, startTime, endTime])

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-700">Availability Check</h4>
        <button
          type="button"
          onClick={checkAvailability}
          disabled={checking || !eventDate || !startTime || !endTime}
          className="btn-secondary btn-sm flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check Now'}
        </button>
      </div>

      {result && (
        <div className={`rounded-lg border p-3 flex items-start gap-3 ${
          result.available
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {result.available ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              result.available ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.available ? 'Available' : 'Not Available'}
            </p>
            <p className={`text-xs mt-1 ${
              result.available ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.message}
            </p>
            {!result.available && (
              <p className="text-xs text-red-600 mt-2">
                Please select a different date or time to avoid conflicts.
              </p>
            )}
          </div>
        </div>
      )}

      {!result && !checking && (
        <p className="text-xs text-slate-500">
          Click "Check Now" to verify this time slot is still available before booking.
        </p>
      )}
    </div>
  )
}
