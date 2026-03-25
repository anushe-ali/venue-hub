import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BuildingOffice2Icon, FunnelIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline'
import { VENUE_TYPES, AMENITIES_LIST } from '@/lib/utils'
import VenueCard from '@/components/venues/VenueCard'
import VenueFilters from '@/components/venues/VenueFilters'

interface SearchParams {
  city?: string
  date?: string
  capacity?: string
  venue_type?: string
  min_price?: string
  max_price?: string
  amenities?: string
}

export default async function VenuesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = createClient()

  let query = supabase
    .from('venues')
    .select('*, manager:profiles(full_name), reviews(rating)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (params.city)       query = query.ilike('city', `%${params.city}%`)
  if (params.venue_type) query = query.eq('venue_type', params.venue_type)
  if (params.capacity)   query = query.gte('capacity', parseInt(params.capacity))
  if (params.min_price)  query = query.gte('hourly_rate', parseInt(params.min_price))
  if (params.max_price)  query = query.lte('hourly_rate', parseInt(params.max_price))
  if (params.amenities) {
    const amenList = params.amenities.split(',')
    query = query.contains('amenities', amenList)
  }

  const { data: venues, error } = await query.limit(50)

  const venuesWithRating = (venues ?? []).map((v: any) => {
    const ratings = (v.reviews ?? []).map((r: any) => r.rating).filter(Boolean)
    return {
      ...v,
      avg_rating: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null,
      review_count: ratings.length,
    }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Discover Venues</h1>
          <p className="page-subtitle">
            {venuesWithRating.length} venue{venuesWithRating.length !== 1 ? 's' : ''} available
            {params.city ? ` in ${params.city}` : ''}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        <aside className="w-64 shrink-0">
          <VenueFilters searchParams={params} />
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {venuesWithRating.length === 0 ? (
            <div className="card p-16 text-center">
              <BuildingOffice2Icon className="h-14 w-14 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No venues found</h3>
              <p className="text-slate-400 text-sm">Try adjusting your filters or search in a different city.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {venuesWithRating.map((venue: any) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
