import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { BuildingStorefrontIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function ManagerVenuesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: venues } = await supabase
    .from('venues')
    .select('*, bookings:bookings(id, status)')
    .eq('manager_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Venues</h1>
          <p className="page-subtitle">{venues?.length ?? 0} venue{venues?.length !== 1 ? 's' : ''} listed</p>
        </div>
        <Link href="/manager/venues/new" className="btn-primary btn">
          <PlusIcon className="h-4 w-4" /> Add Venue
        </Link>
      </div>

      {!venues?.length ? (
        <div className="card p-16 text-center">
          <BuildingStorefrontIcon className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No venues yet</h3>
          <p className="text-slate-400 text-sm mb-5">Add your first venue to start receiving bookings.</p>
          <Link href="/manager/venues/new" className="btn-primary btn btn-sm">Add Venue</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.map((v: any) => {
            const pending = v.bookings?.filter((b: any) => b.status === 'pending').length ?? 0
            const total = v.bookings?.length ?? 0
            return (
              <div key={v.id} className="card overflow-hidden">
                <div className="h-36 bg-slate-100 overflow-hidden">
                  {v.photos?.[0]
                    ? <img src={v.photos[0]} alt={v.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🏢</div>
                  }
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{v.name}</h3>
                    <span className={`badge shrink-0 ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{v.city} · {v.venue_type}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="font-semibold text-slate-900">{v.capacity}</div>
                      <div className="text-slate-400">Capacity</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="font-semibold text-slate-900">{total}</div>
                      <div className="text-slate-400">Bookings</div>
                    </div>
                    <div className={`rounded-lg p-2 ${pending > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      <div className={`font-semibold ${pending > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{pending}</div>
                      <div className="text-slate-400">Pending</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-700 mb-3">{formatCurrency(v.hourly_rate)}/hr</div>
                  <div className="flex gap-2">
                    <Link href={`/venues/${v.id}`} className="btn-secondary btn btn-sm flex-1 justify-center">View</Link>
                    <Link href={`/manager/venues/${v.id}`} className="btn-primary btn btn-sm flex-1 justify-center">
                      <PencilIcon className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
