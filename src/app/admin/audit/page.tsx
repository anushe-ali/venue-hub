import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/utils'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import type { AdminAuditLog } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminAuditLogPage({
  searchParams
}: {
  searchParams: { admin?: string; action?: string; target?: string }
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
    .from('admin_audit_logs')
    .select('*, admin:profiles!admin_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  // Apply filters
  if (params.admin) query = query.eq('admin_id', params.admin)
  if (params.action) query = query.eq('action_type', params.action)
  if (params.target) query = query.eq('target_type', params.target)

  const { data: logs } = await query as { data: AdminAuditLog[] | null }

  // Get unique admins for filter
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'admin')
    .order('full_name')

  // Action types
  const actionTypes = [
    'all',
    'user_role_change',
    'user_activate',
    'user_deactivate',
    'booking_cancel',
    'settings_update',
  ]

  // Target types
  const targetTypes = ['all', 'user', 'booking', 'venue', 'settings']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{logs?.length ?? 0} recent admin actions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {/* Admin Filter */}
        <form method="GET" action="/admin/audit" className="flex gap-2">
          {params.action && <input type="hidden" name="action" value={params.action} />}
          {params.target && <input type="hidden" name="target" value={params.target} />}
          <select name="admin" defaultValue={params.admin ?? ''} className="input w-48">
            <option value="">All Admins</option>
            {admins?.map(a => (
              <option key={a.id} value={a.id}>
                {a.full_name} ({a.email})
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary btn-sm">Filter</button>
        </form>

        {/* Action Type Filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {actionTypes.map(a => (
            <a
              key={a}
              href={a === 'all' ? '/admin/audit' : `/admin/audit?action=${a}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                (a === 'all' && !params.action) || params.action === a
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {a.replace('_', ' ')}
            </a>
          ))}
        </div>

        {/* Target Type Filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {targetTypes.map(t => (
            <a
              key={t}
              href={t === 'all' ? '/admin/audit' : `/admin/audit?target=${t}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                (t === 'all' && !params.target) || params.target === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </a>
          ))}
        </div>
      </div>

      {/* Audit Log List */}
      <div className="space-y-3">
        {(logs ?? []).map((log) => (
          <div key={log.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold shrink-0 mt-1">
                {(log.admin as any)?.full_name?.charAt(0) ?? '?'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {(log.admin as any)?.full_name ?? 'System'}
                    </p>
                    <p className="text-xs text-slate-400">{(log.admin as any)?.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{formatRelative(log.created_at)}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="badge bg-purple-100 text-purple-700 text-xs capitalize">
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="badge bg-slate-100 text-slate-600 text-xs capitalize">
                        {log.target_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-700 mb-3">{log.description}</p>

                {/* Old/New Values */}
                {(log.old_value || log.new_value) && (
                  <details className="group">
                    <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700">
                      View changes
                    </summary>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg space-y-2">
                      {log.old_value && (
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1">Old Value:</p>
                          <pre className="text-xs text-slate-700 overflow-x-auto">
                            {JSON.stringify(log.old_value, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_value && (
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1">New Value:</p>
                          <pre className="text-xs text-slate-700 overflow-x-auto">
                            {JSON.stringify(log.new_value, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Target Link */}
                {log.target_id && log.target_type === 'user' && (
                  <Link
                    href={`/admin/users/${log.target_id}`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    View user →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {!(logs ?? []).length && (
          <div className="card p-12 text-center">
            <ClipboardDocumentCheckIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No audit log entries found.</p>
          </div>
        )}
      </div>

      {/* Pagination note */}
      {(logs ?? []).length >= 100 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Showing most recent 100 entries. Use filters to narrow results.
          </p>
        </div>
      )}
    </div>
  )
}
