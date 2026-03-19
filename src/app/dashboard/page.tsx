import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime, getStatusColor } from '@/lib/utils'
import {
  CalendarDaysIcon,
  CreditCardIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Redirect managers to their dashboard
  if (profile?.role === 'manager') redirect('/manager/dashboard')
  if (profile?.role === 'admin') redirect('/admin/users')

  // Fetch organizer stats
  const [
    { data: bookings },
    { count: totalBookings },
    { count: pendingCount },
    { count: approvedCount },
  ] = await Promise.all([
    supabase.from('bookings').select('*, venue:venues(name, city, photos)').eq('organizer_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('organizer_id', user.id),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('organizer_id', user.id).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('organizer_id', user.id).eq('status', 'approved'),
  ])

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('payer_id', user.id)

  const totalSpent = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)

  const stats = [
    { label: 'Total Bookings',  value: totalBookings ?? 0,          Icon: CalendarDaysIcon,  color: 'brand' },
    { label: 'Pending',         value: pendingCount ?? 0,            Icon: ClockIcon,          color: 'amber' },
    { label: 'Confirmed',       value: approvedCount ?? 0,           Icon: CheckCircleIcon,    color: 'green' },
    { label: 'Total Spent',     value: formatCurrency(totalSpent),   Icon: CreditCardIcon,     color: 'purple' },
  ]

  const colorMap: Record<string, string> = {
    brand:  'bg-brand-50 text-brand-700',
    amber:  'bg-amber-50 text-amber-700',
    green:  'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's an overview of your event bookings</p>
        </div>
        <Link href="/venues" className="btn-primary btn">
          <MagnifyingGlassIcon className="h-4 w-4" />
          Find a Venue
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/venues',        label: 'Search Venues',    desc: 'Find the perfect space',   icon: '🔍', bg: 'bg-brand-50' },
          { href: '/bookings',      label: 'View Bookings',    desc: 'Manage your reservations', icon: '📅', bg: 'bg-amber-50' },
          { href: '/payments',      label: 'Payments',         desc: 'Track invoices & deposits', icon: '💳', bg: 'bg-green-50' },
        ].map(a => (
          <Link key={a.href} href={a.href} className="card-hover p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl ${a.bg} flex items-center justify-center text-2xl shrink-0`}>{a.icon}</div>
            <div>
              <div className="font-semibold text-slate-900">{a.label}</div>
              <div className="text-xs text-slate-500">{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Recent Bookings</h2>
          <Link href="/bookings" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No bookings yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Find your first venue and make a booking</p>
            <Link href="/venues" className="btn-primary btn btn-sm">Browse Venues</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {bookings.map((b: any) => (
              <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {b.venue?.photos?.[0] ? (
                    <img src={b.venue.photos[0]} alt={b.venue?.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl">🏢</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{b.event_name}</p>
                  <p className="text-sm text-slate-500 truncate">{b.venue?.name} · {b.venue?.city}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(b.event_date)} · {formatTime(b.start_time)}–{formatTime(b.end_time)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`badge ${getStatusColor(b.status)}`}>{b.status}</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(b.total_amount)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
