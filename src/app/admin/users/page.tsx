import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatRelative } from '@/lib/utils'
import { UsersIcon } from '@heroicons/react/24/outline'

export default async function AdminUsersPage({ searchParams }: { searchParams: { role?: string; q?: string } }) {
  const params = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (params.role) query = query.eq('role', params.role)
  if (params.q) query = query.or(`full_name.ilike.%${params.q}%,email.ilike.%${params.q}%`)

  const { data: users, count } = await query

  const roles = ['all', 'organizer', 'manager', 'admin']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{count ?? users?.length ?? 0} registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {roles.map(r => (
            <a
              key={r}
              href={r === 'all' ? '/admin/users' : `/admin/users?role=${r}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                (r === 'all' && !params.role) || params.role === r
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r}
            </a>
          ))}
        </div>
        <form method="GET" action="/admin/users">
          {params.role && <input type="hidden" name="role" value={params.role} />}
          <input name="q" defaultValue={params.q} className="input w-64" placeholder="Search by name or email…" />
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">User</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Role</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Organization</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(users ?? []).map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {u.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`badge capitalize ${
                    u.role === 'admin'   ? 'bg-purple-100 text-purple-700' :
                    u.role === 'manager' ? 'bg-brand-100 text-brand-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{u.role}</span>
                </td>
                <td className="px-5 py-4 text-slate-600">{u.organization ?? '—'}</td>
                <td className="px-5 py-4 text-slate-400 text-xs">{formatRelative(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(users ?? []).length && (
          <div className="p-12 text-center">
            <UsersIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No users found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
