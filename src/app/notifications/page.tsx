import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/utils'
import Link from 'next/link'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import MarkAllReadButton from '@/components/layout/MarkAllReadButton'

const TYPE_ICONS: Record<string, string> = {
  booking_submitted:      '📋',
  booking_approved:       '✅',
  booking_rejected:       '❌',
  booking_cancelled:      '🚫',
  payment_confirmed:      '💳',
  event_reminder:         '⏰',
  modification_requested: '🔄',
  modification_approved:  '✅',
  modification_rejected:  '❌',
  refund_processed:       '💰',
}

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mark all as read on page load
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{notifications?.length ?? 0} notifications</p>
        </div>
        <MarkAllReadButton userId={user.id} />
      </div>

      {!notifications?.length ? (
        <div className="card p-16 text-center">
          <BellIcon className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">All caught up!</h3>
          <p className="text-slate-400 text-sm">You have no notifications.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-50">
          {notifications.map(n => (
            <div key={n.id} className={`flex gap-4 p-5 ${n.is_read ? '' : 'bg-brand-50'}`}>
              <div className="text-2xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</p>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400">{formatRelative(n.created_at)}</span>
                  {n.booking_id && (
                    <Link href={`/bookings/${n.booking_id}`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                      View booking →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
