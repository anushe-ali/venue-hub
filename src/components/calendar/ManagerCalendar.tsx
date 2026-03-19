'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { formatTime, getStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Booking {
  id: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  status: string
  venue?: { name: string }
  organizer?: { full_name: string }
}

interface Venue {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ManagerCalendar({ bookings, venues }: { bookings: Booking[]; venues: Venue[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedVenue, setSelectedVenue] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  const filtered = bookings.filter(b =>
    selectedVenue === 'all' || b.venue?.name === venues.find(v => v.id === selectedVenue)?.name
  )

  const getBookingsForDay = (date: Date) =>
    filtered.filter(b => isSameDay(parseISO(b.event_date), date))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 w-40 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary btn btn-sm ml-2">Today</button>
        </div>

        <select
          value={selectedVenue}
          onChange={e => setSelectedVenue(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All venues</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div className="flex gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-3">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calDays.map(day => {
              const dayBookings = getBookingsForDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[110px] p-2 text-sm',
                    !inMonth && 'bg-slate-50',
                    today && 'bg-brand-50'
                  )}
                >
                  <span className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full text-xs font-medium mb-1',
                    today ? 'bg-brand-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'
                  )}>
                    {format(day, 'd')}
                  </span>

                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map(b => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className={cn(
                          'w-full text-left rounded px-1.5 py-0.5 text-[10px] border truncate leading-relaxed',
                          STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        )}
                      >
                        {formatTime(b.start_time)} {b.event_name}
                      </button>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-slate-400 pl-1">+{dayBookings.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Booking detail side panel */}
        {selectedBooking && (
          <div className="w-72 shrink-0">
            <div className="card p-5 sticky top-6">
              <div className="flex items-start justify-between gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 leading-tight">{selectedBooking.event_name}</h3>
                <button onClick={() => setSelectedBooking(null)} className="text-slate-300 hover:text-slate-500 text-lg leading-none">×</button>
              </div>
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div><span className="text-slate-400">Date:</span> {format(parseISO(selectedBooking.event_date), 'MMM d, yyyy')}</div>
                <div><span className="text-slate-400">Time:</span> {formatTime(selectedBooking.start_time)} – {formatTime(selectedBooking.end_time)}</div>
                <div><span className="text-slate-400">Venue:</span> {selectedBooking.venue?.name}</div>
                <div><span className="text-slate-400">Organizer:</span> {selectedBooking.organizer?.full_name}</div>
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className={`badge ml-1 ${getStatusColor(selectedBooking.status)}`}>{selectedBooking.status}</span>
                </div>
              </div>
              <Link href={`/bookings/${selectedBooking.id}`} className="btn-primary btn btn-sm w-full justify-center">
                View Full Details
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        {[
          { color: 'bg-amber-100 border border-amber-200', label: 'Pending' },
          { color: 'bg-green-100 border border-green-200', label: 'Approved' },
          { color: 'bg-red-100 border border-red-200',    label: 'Rejected' },
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
