import Link from 'next/link'
import { BuildingOffice2Icon, MapPinIcon, UsersIcon, StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { formatCurrency } from '@/lib/utils'
import type { Venue } from '@/types'

interface VenueCardProps {
  venue: Venue & { avg_rating?: number; review_count?: number }
}

export default function VenueCard({ venue }: VenueCardProps) {
  return (
    <Link href={`/venues/${venue.id}`} className="card-hover overflow-hidden group flex flex-col">
      {/* Image */}
      <div className="h-44 bg-slate-100 overflow-hidden relative">
        {venue.photos?.[0] ? (
          <img
            src={venue.photos[0]}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BuildingOffice2Icon className="h-12 w-12 text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="badge bg-white/90 text-slate-700 backdrop-blur">{venue.venue_type}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">{venue.name}</h3>

        <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{venue.address}, {venue.city}</span>
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1 mb-3">
          {venue.amenities?.slice(0, 3).map(a => (
            <span key={a} className="badge bg-slate-100 text-slate-600 capitalize">{a.replace('_', ' ')}</span>
          ))}
          {(venue.amenities?.length ?? 0) > 3 && (
            <span className="badge bg-slate-100 text-slate-500">+{venue.amenities.length - 3}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <UsersIcon className="h-4 w-4" />
            <span>Up to {venue.capacity}</span>
          </div>

          <div className="text-right">
            <div className="font-bold text-slate-900 text-sm">
              {formatCurrency(venue.hourly_rate)}<span className="font-normal text-slate-400">/hr</span>
            </div>
            {venue.avg_rating && (
              <div className="flex items-center gap-1 justify-end text-xs text-amber-500">
                <StarSolid className="h-3 w-3" />
                <span>{venue.avg_rating.toFixed(1)}</span>
                <span className="text-slate-400">({venue.review_count})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
