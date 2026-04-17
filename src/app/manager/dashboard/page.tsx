import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime, getStatusColor } from '@/lib/utils'
import {
  ClipboardDocumentListIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, CurrencyDollarIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function ManagerDashboard({ searchParams }: { searchParams: { status?: string } }) {
  const params = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!['manager', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  // Get manager's venues
  const { data: venues } = await supabase.from('venues').select('id').eq('manager_id', user.id)
  const venueIds = venues?.map(v => v.id) ?? []

  // Stats
  const [
    { count: pending },
    { count: approved },
    { count: rejected },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('status', 'approved'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('venue_id', venueIds).eq('status', 'rejected'),
  ])

  // Revenue
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, booking:bookings!inner(venue_id)')
    .in('bookings.venue_id', venueIds)
    .neq('payment_type', 'refund')

  const totalRevenue = (payments ?? []).reduce((s, p) => s + p.amount, 0)

  // Bookings list
  let query = supabase
    .from('bookings')
    .select('*, venue:venues(name, city), organizer:profiles!organizer_id(full_name, organization)')
    .in('venue_id', venueIds)
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  const { data: bookings } = await query.limit(50)

  const stats = [
    { label: 'Pending Review',  value: pending ?? 0,              Icon: ClockIcon,                  color: 'bg-amber-50 text-amber-700' },
    { label: 'Confirmed',       value: approved ?? 0,             Icon: CheckCircleIcon,             color: 'bg-green-50 text-green-700' },
    { label: 'Rejected',        value: rejected ?? 0,             Icon: XCircleIcon,                 color: 'bg-red-50 text-red-700' },
    { label: 'Total Revenue',   value: formatCurrency(totalRevenue), Icon: CurrencyDollarIcon,      color: 'bg-brand-50 text-brand-700' },
  ]

  const statuses = ['all', 'pending', 'approved', 'rejected', 'cancelled', 'completed']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Booking Requests</h1>
          <p className="page-subtitle">Manage bookings across your venues</p>
        </div>
        <Link href="/manager/venues/new" className="btn-primary btn">+ Add Venue</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {statuses.map(s => (
          <Link
            key={s}
            href={s === 'all' ? '/manager/dashboard' : `/manager/dashboard?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              (s === 'all' && !params.status) || params.status === s
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
            {s === 'pending' && (pending ?? 0) > 0 && (
              <span className="ml-1.5 badge bg-amber-500 text-white">{pending}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Bookings table */}
      {!bookings?.length ? (
        <div className="card p-16 text-center">
          <ClipboardDocumentListIcon className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No booking requests</h3>
          <p className="text-slate-400 text-sm">
            {params.status ? `No ${params.status} bookings.` : "You haven't received any bookings yet."}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Event / Organizer</th>
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Venue</th>
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Date & Time</th>
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Amount</th>
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">{b.event_name}</div>
                    <div className="text-xs text-slate-400">{b.organizer?.full_name}{b.organizer?.organization ? ` · ${b.organizer.organization}` : ''}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{b.venue?.name}</td>
                  <td className="px-5 py-4">
                    <div className="text-slate-900">{formatDate(b.event_date)}</div>
                    <div className="text-xs text-slate-400">{formatTime(b.start_time)} – {formatTime(b.end_time)}</div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(b.total_amount)}</td>
                  <td className="px-5 py-4">
                    <span className={`badge ${getStatusColor(b.status)}`}>{b.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/bookings/${b.id}`} className="btn-ghost btn btn-sm flex items-center gap-1">
                      Review <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
