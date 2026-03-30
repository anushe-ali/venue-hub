import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserRoleEditor } from '@/components/admin/UserRoleEditor'
import { UserStatusToggle } from '@/components/admin/UserStatusToggle'
import { formatDate, formatRelative, formatCurrency } from '@/lib/utils'
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon, CalendarIcon } from '@heroicons/react/24/outline'
import type { Profile, AdminAuditLog } from '@/types'

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = createClient()

  // Auth check
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect('/auth/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  // Fetch user profile
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single() as { data: Profile | null }

  if (!targetUser) notFound()

  // Fetch user activity based on role
  let activityStats = null

  if (targetUser.role === 'organizer') {
    // Get organizer stats
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, payments(amount)')
      .eq('organizer_id', id)

    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewer_id', id)

    const totalSpent = bookings?.reduce((sum, b) => {
      const payments = (b.payments as any[]) || []
      return sum + payments.reduce((psum, p) => psum + (p.amount || 0), 0)
    }, 0) || 0

    activityStats = {
      bookings: bookings?.length || 0,
      totalSpent,
      reviewsGiven: reviews?.length || 0,
    }
  } else if (targetUser.role === 'manager') {
    // Get manager stats
    const { data: venues } = await supabase
      .from('venues')
      .select('*, bookings(*)')
      .eq('manager_id', id)

    const totalBookings = venues?.reduce((sum, v) => sum + ((v.bookings as any[])?.length || 0), 0) || 0

    // Calculate revenue
    const venueIds = venues?.map(v => v.id) || []
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, booking:bookings!inner(venue_id)')
      .in('booking.venue_id', venueIds)
      .neq('payment_type', 'refund')

    const revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    activityStats = {
      venues: venues?.length || 0,
      bookingsReceived: totalBookings,
      totalRevenue: revenue,
    }
  }

  // Fetch audit log for this user
  const { data: auditLogs } = await supabase
    .from('admin_audit_logs')
    .select('*, admin:profiles!admin_id(full_name, email)')
    .eq('target_type', 'user')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(10) as { data: AdminAuditLog[] | null }

  return (
    <div>
      {/* Header with Back Button */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="page-header">
          <div>
            <h1 className="page-title">{targetUser.full_name}</h1>
            <p className="page-subtitle">User Profile & Management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold shrink-0">
                {targetUser.full_name?.charAt(0) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-slate-900">{targetUser.full_name}</h2>
                <span className={`badge capitalize ${
                  targetUser.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  targetUser.role === 'manager' ? 'bg-brand-100 text-brand-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {targetUser.role}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{targetUser.email}</span>
              </div>
              {targetUser.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <PhoneIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">{targetUser.phone}</span>
                </div>
              )}
              {targetUser.organization && (
                <div className="flex items-center gap-3 text-sm">
                  <BuildingOfficeIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">{targetUser.organization}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Joined {formatDate(targetUser.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          {activityStats && (
            <div className="card">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity Summary</h3>
              {targetUser.role === 'organizer' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Bookings</span>
                    <span className="text-lg font-semibold text-slate-900">{activityStats.bookings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Spent</span>
                    <span className="text-lg font-semibold text-slate-900">{formatCurrency(activityStats.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Reviews Given</span>
                    <span className="text-lg font-semibold text-slate-900">{activityStats.reviewsGiven}</span>
                  </div>
                </div>
              )}
              {targetUser.role === 'manager' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Venues</span>
                    <span className="text-lg font-semibold text-slate-900">{activityStats.venues}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Bookings Received</span>
                    <span className="text-lg font-semibold text-slate-900">{activityStats.bookingsReceived}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Revenue</span>
                    <span className="text-lg font-semibold text-slate-900">{formatCurrency(activityStats.totalRevenue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Management & Audit Log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role Editor */}
          <UserRoleEditor
            userId={targetUser.id}
            currentRole={targetUser.role}
            userName={targetUser.full_name}
          />

          {/* Status Toggle */}
          <UserStatusToggle
            userId={targetUser.id}
            isActive={targetUser.is_active}
            userName={targetUser.full_name}
            userRole={targetUser.role}
          />

          {/* Audit Log */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Audit Log</h3>
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {(log.admin as any)?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium mb-0.5">
                          {(log.admin as any)?.full_name ?? 'System'}
                        </p>
                        <p className="text-sm text-slate-600">{log.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatRelative(log.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No admin actions recorded for this user</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
