import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/admin/StatCard'
import { formatRelative, formatCurrency, formatDate } from '@/lib/utils'
import {
  UsersIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import type { AdminAnalyticsSummary, Profile, Booking, AdminAuditLog } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
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

  // Fetch analytics summary
  const { data: analytics } = await supabase
    .from('admin_analytics_summary')
    .select('*')
    .single() as { data: AdminAnalyticsSummary | null }

  // Refresh analytics if stale (older than 5 minutes)
  if (analytics) {
    const lastUpdated = new Date(analytics.last_updated)
    const now = new Date()
    const minutesSinceUpdate = (now.getTime() - lastUpdated.getTime()) / 60000

    if (minutesSinceUpdate > 5) {
      await supabase.rpc('refresh_admin_analytics')
    }
  }

  // Fetch recent bookings
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('*, venue:venues(name), organizer:profiles!organizer_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(5) as { data: Booking[] | null }

  // Fetch recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5) as { data: Profile[] | null }

  // Fetch recent admin actions
  const { data: recentActions } = await supabase
    .from('admin_audit_logs')
    .select('*, admin:profiles!admin_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(5) as { data: AdminAuditLog[] | null }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and recent activity</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={analytics?.active_users ?? 0}
          icon={UsersIcon}
          color="brand"
          subtitle={`${analytics?.organizer_count ?? 0} organizers, ${analytics?.manager_count ?? 0} managers`}
        />
        <StatCard
          title="Active Venues"
          value={analytics?.active_venues ?? 0}
          icon={BuildingStorefrontIcon}
          color="purple"
        />
        <StatCard
          title="Pending Bookings"
          value={analytics?.pending_bookings ?? 0}
          icon={ClockIcon}
          color="amber"
          subtitle={`${analytics?.approved_bookings ?? 0} approved`}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics?.total_revenue ?? 0)}
          icon={CurrencyDollarIcon}
          color="green"
          subtitle={`${formatCurrency(analytics?.revenue_last_30_days ?? 0)} last 30 days`}
        />
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Bookings</h3>
            <Link href="/admin/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentBookings?.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="block p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-900 text-sm">{booking.event_name}</p>
                  <span className={`badge capitalize ${
                    booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    booking.status === 'approved' ? 'bg-green-100 text-green-700' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{(booking.venue as any)?.name}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(booking.event_date)}</p>
              </Link>
            ))}
            {!recentBookings?.length && (
              <p className="text-sm text-slate-400 text-center py-8">No recent bookings</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Users</h3>
            <Link href="/admin/users" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers?.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="block p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {u.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{u.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`badge capitalize text-xs ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'manager' ? 'bg-brand-100 text-brand-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                      <span className="text-xs text-slate-400">{formatRelative(u.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {!recentUsers?.length && (
              <p className="text-sm text-slate-400 text-center py-8">No recent users</p>
            )}
          </div>
        </div>

        {/* Recent Admin Actions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Admin Activity</h3>
            <Link href="/admin/audit" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentActions?.map((action) => (
              <div key={action.id} className="p-3 rounded-lg border border-slate-100">
                <div className="flex items-start gap-2">
                  <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {(action.admin as any)?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{action.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatRelative(action.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
            {!recentActions?.length && (
              <p className="text-sm text-slate-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
