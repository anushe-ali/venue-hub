'use client'

import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  isPast, parseISO, isWithinInterval
} from 'date-fns'
import { cn } from '@/lib/utils'

interface Booking {
  event_date: string
  start_time: string
  end_time: string
  setup_start_time: string
  cleanup_end_time: string
  status: string
}

interface Blackout {
  start_date: string
  end_date: string
  reason?: string
}

interface VenueAvailabilityCalendarProps {
  venueId: string
  bookings: Booking[]
  blackouts: Blackout[]
  operatingHours: any
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function VenueAvailabilityCalendar({
  bookings, blackouts, operatingHours
}: VenueAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const isBlackedOut = (date: Date) =>
    blackouts.some(b =>
      isWithinInterval(date, { start: parseISO(b.start_date), end: parseISO(b.end_date) })
    )

  const getBookingsForDay = (date: Date) =>
    bookings.filter(b => isSameDay(parseISO(b.event_date), date))

  const isFullyBooked = (date: Date) => {
    const dayBookings = getBookingsForDay(date)
    // Simplified: if there's an approved booking, show as booked
    return dayBookings.some(b => b.status === 'approved')
  }

  const hasPartialBooking = (date: Date) => {
    const dayBookings = getBookingsForDay(date)
    return dayBookings.some(b => b.status === 'pending')
  }

  const getDayStatus = (date: Date) => {
    if (isPast(date) && !isToday(date)) return 'past'
    if (isBlackedOut(date)) return 'blackout'
    if (isFullyBooked(date)) return 'booked'
    if (hasPartialBooking(date)) return 'partial'
    return 'available'
  }

  const prev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const next = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-900">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
        {days.map(day => {
          const status = getDayStatus(day)
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'bg-white min-h-[2.5rem] flex items-center justify-center relative',
                !inMonth && 'opacity-30',
                status === 'available' && inMonth && 'hover:bg-brand-50 cursor-pointer',
              )}
            >
              <span className={cn(
                'h-8 w-8 flex items-center justify-center rounded-full text-sm',
                today && 'ring-2 ring-brand-500',
                status === 'past'     && 'text-slate-300',
                status === 'blackout' && 'bg-slate-200 text-slate-400 line-through',
                status === 'booked'   && 'bg-red-100 text-red-600 font-medium',
                status === 'partial'  && 'bg-amber-100 text-amber-700 font-medium',
                status === 'available' && inMonth && 'text-slate-700',
              )}>
                {format(day, 'd')}
              </span>
              {status === 'booked' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-red-400" />
              )}
              {status === 'partial' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-400" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-500">
        {[
          { color: 'bg-white border border-slate-200', label: 'Available' },
          { color: 'bg-amber-100',  label: 'Partially booked' },
          { color: 'bg-red-100',    label: 'Fully booked' },
          { color: 'bg-slate-200',  label: 'Unavailable' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
