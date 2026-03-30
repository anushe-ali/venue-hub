import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/admin/StatCard'
import { formatCurrency } from '@/lib/utils'
import {
  UsersIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  MapPinIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import type {
  AdminAnalyticsSummary,
  UserGrowth,
  RevenueByMonth,
  TopVenue,
  BookingsByStatus,
} from '@/types'

export default async function AdminAnalyticsPage() {
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
  const { data: summary } = await supabase
    .from('admin_analytics_summary')
    .select('*')
    .single() as { data: AdminAnalyticsSummary | null }

  // Fetch user growth (last 30 days)
  const { data: userGrowth } = await supabase
    .rpc('get_user_growth', { days: 30 }) as { data: UserGrowth[] | null }

  // Fetch revenue by month (last 6 months)
  const { data: revenue } = await supabase
    .rpc('get_revenue_by_month', { months: 6 }) as { data: RevenueByMonth[] | null }

  // Fetch top venues
  const { data: topVenues } = await supabase
    .rpc('get_top_venues', { limit_count: 5 }) as { data: TopVenue[] | null }

  // Fetch bookings by status
  const { data: bookingStats } = await supabase
    .rpc('get_bookings_by_status') as { data: BookingsByStatus[] | null }

  // User distribution
  const userDistribution = [
    { label: 'Organizers', value: summary?.organizer_count ?? 0, color: 'bg-blue-500' },
    { label: 'Managers', value: summary?.manager_count ?? 0, color: 'bg-purple-500' },
    { label: 'Admins', value: (summary?.active_users ?? 0) - (summary?.organizer_count ?? 0) - (summary?.manager_count ?? 0), color: 'bg-amber-500' },
  ]

  const totalUsers = userDistribution.reduce((sum, item) => sum + item.value, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">Platform metrics and insights</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={summary?.active_users ?? 0}
          icon={UsersIcon}
          color="brand"
        />
        <StatCard
          title="Active Venues"
          value={summary?.active_venues ?? 0}
          icon={BuildingStorefrontIcon}
          color="purple"
        />
        <StatCard
          title="Total Bookings"
          value={(summary?.approved_bookings ?? 0) + (summary?.pending_bookings ?? 0)}
          icon={CalendarIcon}
          color="blue"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary?.total_revenue ?? 0)}
          icon={CurrencyDollarIcon}
          color="green"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">User Growth (Last 30 Days)</h3>
          <div className="space-y-2">
            {userGrowth?.slice(0, 10).map((day) => {
              const maxValue = Math.max(...(userGrowth?.map(d => d.new_users) ?? [1]))
              const percentage = (day.new_users / maxValue) * 100
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-20 shrink-0">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      {day.new_users > 0 && (
                        <span className="text-xs font-medium text-white">{day.new_users}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {!userGrowth?.length && (
            <p className="text-sm text-slate-400 text-center py-8">No user growth data yet</p>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue by Month</h3>
          <div className="space-y-2">
            {revenue?.map((month) => {
              const maxValue = Math.max(...(revenue?.map(m => Number(m.revenue)) ?? [1]))
              const percentage = (Number(month.revenue) / maxValue) * 100
              return (
                <div key={month.month} className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 w-20 shrink-0">{month.month}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      {Number(month.revenue) > 0 && (
                        <span className="text-xs font-medium text-white">
                          {formatCurrency(Number(month.revenue))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {!revenue?.length && (
            <p className="text-sm text-slate-400 text-center py-8">No revenue data yet</p>
          )}
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">User Distribution</h3>
          <div className="space-y-4">
            {userDistribution.map((item) => {
              const percentage = totalUsers > 0 ? (item.value / totalUsers) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.value} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Booking Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Bookings by Status</h3>
          <div className="space-y-3">
            {bookingStats?.map((stat) => (
              <div key={stat.status} className="flex justify-between items-center">
                <span className={`badge capitalize ${
                  stat.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  stat.status === 'approved' ? 'bg-green-100 text-green-700' :
                  stat.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  stat.status === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                  stat.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {stat.status}
                </span>
                <span className="text-lg font-semibold text-slate-900">{Number(stat.count)}</span>
              </div>
            ))}
          </div>
          {!bookingStats?.length && (
            <p className="text-sm text-slate-400 text-center py-8">No booking data yet</p>
          )}
        </div>

        {/* Top Venues */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Venues</h3>
          <div className="space-y-3">
            {topVenues?.map((venue, index) => (
              <div key={venue.venue_id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{venue.venue_name}</p>
                  <p className="text-xs text-slate-500">{venue.city}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">
                      {Number(venue.booking_count)} bookings
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      {formatCurrency(Number(venue.total_revenue))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!topVenues?.length && (
            <p className="text-sm text-slate-400 text-center py-8">No venue data yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
