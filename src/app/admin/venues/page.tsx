import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatRelative } from '@/lib/utils'
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function AdminVenuesPage({ searchParams }: { searchParams: { q?: string; active?: string } }) {
  const params = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  let query = supabase
    .from('venues')
    .select('*, manager:profiles(full_name, email), bookings:bookings(id)')
    .order('created_at', { ascending: false })

  if (params.active === 'true')  query = query.eq('is_active', true)
  if (params.active === 'false') query = query.eq('is_active', false)
  if (params.q) query = query.or(`name.ilike.%${params.q}%,city.ilike.%${params.q}%`)

  const { data: venues } = await query

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Venues</h1>
          <p className="page-subtitle">{venues?.length ?? 0} venues on platform</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { label: 'All',      value: '' },
            { label: 'Active',   value: 'true' },
            { label: 'Inactive', value: 'false' },
          ].map(({ label, value }) => (
            <a
              key={label}
              href={value ? `/admin/venues?active=${value}` : '/admin/venues'}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                (params.active ?? '') === value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
        <form method="GET" action="/admin/venues">
          {params.active && <input type="hidden" name="active" value={params.active} />}
          <input name="q" defaultValue={params.q} className="input w-64" placeholder="Search by name or city…" />
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Venue</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Manager</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">City</th>
              <th className="text-right px-5 py-3.5 font-medium text-slate-500">Rate</th>
              <th className="text-right px-5 py-3.5 font-medium text-slate-500">Bookings</th>
              <th className="text-center px-5 py-3.5 font-medium text-slate-500">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(venues ?? []).map((v: any) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">{v.name}</div>
                  <div className="text-xs text-slate-400">{v.venue_type} · {v.capacity} cap.</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-slate-700">{(v.manager as any)?.full_name}</div>
                  <div className="text-xs text-slate-400">{(v.manager as any)?.email}</div>
                </td>
                <td className="px-5 py-4 text-slate-600">{v.city}</td>
                <td className="px-5 py-4 text-right font-medium text-slate-900">{formatCurrency(v.hourly_rate)}/hr</td>
                <td className="px-5 py-4 text-right text-slate-600">{v.bookings?.length ?? 0}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`badge ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {v.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <Link href={`/venues/${v.id}`} className="btn-ghost btn btn-sm">View</Link>
                    <Link href={`/manager/venues/${v.id}`} className="btn-secondary btn btn-sm">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(venues ?? []).length && (
          <div className="p-12 text-center">
            <BuildingStorefrontIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No venues found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
