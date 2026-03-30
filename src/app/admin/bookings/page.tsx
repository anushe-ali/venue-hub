import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { CalendarIcon } from '@heroicons/react/24/outline'
import type { Booking } from '@/types'

export default async function AdminBookingsPage({
  searchParams
}: {
  searchParams: { status?: string; venue?: string; q?: string }
}) {
  const params = await searchParams
  const supabase = createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Build query
  let query = supabase
    .from('bookings')
    .select('*, venue:venues(name, city), organizer:profiles!organizer_id(full_name, email)')
    .order('created_at', { ascending: false })

  // Apply filters
  if (params.status) query = query.eq('status', params.status)
  if (params.venue) query = query.eq('venue_id', params.venue)
  if (params.q) query = query.or(`event_name.ilike.%${params.q}%`)

  const { data: bookings } = await query as { data: Booking[] | null }

  // Get venues for filter dropdown
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, city')
    .eq('is_active', true)
    .order('name')

  // Status tabs
  const statuses = ['all', 'pending', 'approved', 'rejected', 'cancelled', 'completed']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Bookings</h1>
          <p className="page-subtitle">{bookings?.length ?? 0} bookings found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {/* Status Filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {statuses.map(s => (
            <a
              key={s}
              href={s === 'all' ? '/admin/bookings' : `/admin/bookings?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                (s === 'all' && !params.status) || params.status === s
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </a>
          ))}
        </div>

        {/* Venue Filter */}
        <form method="GET" action="/admin/bookings" className="flex gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <select name="venue" defaultValue={params.venue ?? ''} className="input w-48">
            <option value="">All Venues</option>
            {venues?.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary btn-sm">Filter</button>
        </form>

        {/* Search */}
        <form method="GET" action="/admin/bookings">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {params.venue && <input type="hidden" name="venue" value={params.venue} />}
          <input
            name="q"
            defaultValue={params.q}
            className="input w-64"
            placeholder="Search by event name…"
          />
        </form>
      </div>

      {/* Bookings Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Event</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Venue</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Organizer</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Date & Time</th>
              <th className="text-right px-5 py-3.5 font-medium text-slate-500">Amount</th>
              <th className="text-center px-5 py-3.5 font-medium text-slate-500">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(bookings ?? []).map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">{booking.event_name}</div>
                  <div className="text-xs text-slate-400 capitalize">{booking.event_type}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-slate-700">{(booking.venue as any)?.name}</div>
                  <div className="text-xs text-slate-400">{(booking.venue as any)?.city}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-slate-700">{(booking.organizer as any)?.full_name}</div>
                  <div className="text-xs text-slate-400">{(booking.organizer as any)?.email}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-slate-700">{formatDate(booking.event_date)}</div>
                  <div className="text-xs text-slate-400">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </div>
                </td>
                <td className="px-5 py-4 text-right font-medium text-slate-900">
                  {formatCurrency(booking.total_amount)}
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`badge capitalize ${
                    booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    booking.status === 'approved' ? 'bg-green-100 text-green-700' :
                    booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    booking.status === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                    booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="btn btn-sm btn-ghost"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(bookings ?? []).length && (
          <div className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No bookings found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
