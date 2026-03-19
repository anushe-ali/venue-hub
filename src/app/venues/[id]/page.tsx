import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  MapPinIcon, UsersIcon, ClockIcon, CurrencyDollarIcon,
  ShieldCheckIcon, StarIcon, CalendarDaysIcon, BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { formatCurrency, formatDate, formatRelative, AMENITIES_LIST } from '@/lib/utils'
import VenueAvailabilityCalendar from '@/components/calendar/VenueAvailabilityCalendar'

export default async function VenueDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select(`
      *,
      manager:profiles(full_name, email, avatar_url),
      layouts:venue_layouts(*),
      equipment:venue_equipment(*),
      reviews(*, reviewer:profiles(full_name, avatar_url))
    `)
    .eq('id', params.id)
    .eq('is_active', true)
    .single()

  if (!venue) notFound()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('event_date, start_time, end_time, setup_start_time, cleanup_end_time, status')
    .eq('venue_id', params.id)
    .in('status', ['pending', 'approved'])
    .gte('event_date', new Date().toISOString().split('T')[0])

  const { data: blackouts } = await supabase
    .from('venue_blackouts')
    .select('*')
    .eq('venue_id', params.id)

  const reviews = (venue.reviews as any[]) ?? []
  const avgRating = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : null

  const amenityLabels = AMENITIES_LIST.reduce((acc, a) => ({ ...acc, [a.value]: a.label }), {} as Record<string, string>)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-5">
        <Link href="/venues" className="hover:text-brand-600">Venues</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-900">{venue.name}</span>
      </nav>

      {/* Photo Gallery */}
      <div className="mb-8 rounded-2xl overflow-hidden grid grid-cols-4 grid-rows-2 gap-2 h-80">
        {venue.photos?.length ? (
          <>
            <div className="col-span-2 row-span-2">
              <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover" />
            </div>
            {venue.photos.slice(1, 5).map((photo: string, i: number) => (
              <div key={i} className="overflow-hidden">
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {(venue.photos.length < 5) && Array.from({ length: 4 - Math.max(0, venue.photos.length - 1) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-100 flex items-center justify-center">
                <BuildingOffice2Icon className="h-8 w-8 text-slate-300" />
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-4 row-span-2 bg-slate-100 flex items-center justify-center">
            <BuildingOffice2Icon className="h-16 w-16 text-slate-300" />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Title */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{venue.name}</h1>
              <span className="badge bg-brand-100 text-brand-700 shrink-0 text-sm">{venue.venue_type}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPinIcon className="h-4 w-4" />
              <span>{venue.address}, {venue.city}{venue.state ? `, ${venue.state}` : ''}, {venue.country}</span>
            </div>
            {avgRating && (
              <div className="flex items-center gap-1.5 mt-2">
                {[1,2,3,4,5].map(s => (
                  <StarSolid key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'text-amber-400' : 'text-slate-200'}`} />
                ))}
                <span className="text-sm font-medium text-slate-700">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-slate-400">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { Icon: UsersIcon,          label: 'Capacity',     value: `${venue.capacity} guests` },
              { Icon: CurrencyDollarIcon, label: 'Hourly Rate',  value: formatCurrency(venue.hourly_rate) },
              { Icon: CalendarDaysIcon,   label: 'Full Day',     value: venue.full_day_rate ? formatCurrency(venue.full_day_rate) : 'N/A' },
              { Icon: ClockIcon,          label: 'Setup Buffer', value: `${venue.setup_buffer_mins} min` },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="card p-4 text-center">
                <Icon className="h-5 w-5 text-brand-600 mx-auto mb-1.5" />
                <div className="text-xs text-slate-500">{label}</div>
                <div className="font-semibold text-slate-900 text-sm mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {venue.description && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">About this venue</h2>
              <p className="text-slate-600 leading-relaxed">{venue.description}</p>
            </div>
          )}

          {/* Amenities */}
          {venue.amenities?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((a: string) => (
                  <span key={a} className="badge bg-brand-50 text-brand-700 px-3 py-1 text-sm">
                    ✓ {amenityLabels[a] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Layouts */}
          {venue.layouts?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Seating Layouts</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {venue.layouts.map((l: any) => (
                  <div key={l.id} className="card p-4">
                    <div className="font-medium text-slate-900">{l.name}</div>
                    <div className="text-sm text-slate-500">Up to {l.capacity} guests</div>
                    {l.description && <div className="text-xs text-slate-400 mt-1">{l.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {venue.equipment?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Equipment & Add-ons</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {venue.equipment.filter((e: any) => e.is_available).map((eq: any) => (
                  <div key={eq.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{eq.name}</div>
                      {eq.description && <div className="text-xs text-slate-400 mt-0.5">{eq.description}</div>}
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {eq.fee > 0 ? `+${formatCurrency(eq.fee)}` : 'Free'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policies */}
          {venue.policies && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Venue Policies</h2>
              <div className="card p-5 bg-amber-50 border-amber-100">
                <div className="flex gap-3">
                  <ShieldCheckIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">{venue.policies}</p>
                </div>
              </div>
            </div>
          )}

          {/* Availability Calendar */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Availability</h2>
            <VenueAvailabilityCalendar
              venueId={venue.id}
              bookings={bookings ?? []}
              blackouts={blackouts ?? []}
              operatingHours={venue.operating_hours}
            />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Reviews <span className="text-slate-400 text-base font-normal">({reviews.length})</span>
              </h2>
              <div className="space-y-4">
                {reviews.map((r: any) => (
                  <div key={r.id} className="card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                        {r.reviewer?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{r.reviewer?.full_name}</div>
                        <div className="text-xs text-slate-400">{formatRelative(r.created_at)}</div>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <StarSolid key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-6">
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatCurrency(venue.hourly_rate)}
              <span className="text-base font-normal text-slate-400">/hr</span>
            </div>
            {venue.full_day_rate && (
              <div className="text-sm text-slate-500 mb-4">
                Full day: {formatCurrency(venue.full_day_rate)}
              </div>
            )}

            <div className="space-y-3 mb-5 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-slate-400" />
                Up to {venue.capacity} guests
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-slate-400" />
                {venue.setup_buffer_mins}min setup + {venue.cleanup_buffer_mins}min cleanup included
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-slate-400" />
                {venue.deposit_percent}% deposit required
              </div>
            </div>

            <Link
              href={`/venues/${venue.id}/book`}
              className="btn-primary btn w-full justify-center btn-lg mb-3"
            >
              <CalendarDaysIcon className="h-5 w-5" />
              Book This Venue
            </Link>

            <p className="text-xs text-center text-slate-400">
              You won&apos;t be charged until your booking is confirmed
            </p>

            {/* Manager info */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2">Managed by</p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {(venue.manager as any)?.full_name?.charAt(0) ?? 'M'}
                </div>
                <span className="text-sm font-medium text-slate-700">{(venue.manager as any)?.full_name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
