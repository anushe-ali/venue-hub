import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime, getStatusColor } from '@/lib/utils'
import { CalendarDaysIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default async function BookingsPage({ searchParams }: { searchParams: { status?: string } }) {
  const params = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let query = supabase
    .from('bookings')
    .select('*, venue:venues(name, city, photos)')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: false })

  if (params.status) query = query.eq('status', params.status)

  const { data: bookings } = await query

  const statuses = ['all', 'pending', 'approved', 'rejected', 'cancelled', 'completed']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">{bookings?.length ?? 0} booking{bookings?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/venues" className="btn-primary btn">
          <MagnifyingGlassIcon className="h-4 w-4" /> Book a Venue
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {statuses.map(s => (
          <Link
            key={s}
            href={s === 'all' ? '/bookings' : `/bookings?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              (s === 'all' && !params.status) || params.status === s
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {!bookings?.length ? (
        <div className="card p-16 text-center">
          <CalendarDaysIcon className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No bookings found</h3>
          <p className="text-slate-400 text-sm mb-5">
            {params.status ? `No ${params.status} bookings.` : "You haven't made any bookings yet."}
          </p>
          <Link href="/venues" className="btn-primary btn btn-sm">Browse Venues</Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-50">
          {bookings.map((b: any) => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors">
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {b.venue?.photos?.[0]
                  ? <img src={b.venue.photos[0]} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-2xl">🏢</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{b.event_name}</p>
                <p className="text-sm text-slate-500">{b.venue?.name} · {b.venue?.city}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(b.event_date)} · {formatTime(b.start_time)} – {formatTime(b.end_time)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`badge ${getStatusColor(b.status)}`}>{b.status}</span>
                <span className={`badge text-xs ${getStatusColor(b.payment_status)}`}>{b.payment_status.replace('_', ' ')}</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(b.total_amount)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
