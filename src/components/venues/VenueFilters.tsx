'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { VENUE_TYPES, AMENITIES_LIST } from '@/lib/utils'

interface FiltersForm {
  city: string
  capacity: string
  venue_type: string
  min_price: string
  max_price: string
  amenities: string[]
}

export default function VenueFilters({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const router = useRouter()
  const pathname = usePathname()
  const { register, handleSubmit, reset } = useForm<FiltersForm>({
    defaultValues: {
      city: searchParams.city ?? '',
      capacity: searchParams.capacity ?? '',
      venue_type: searchParams.venue_type ?? '',
      min_price: searchParams.min_price ?? '',
      max_price: searchParams.max_price ?? '',
      amenities: searchParams.amenities ? searchParams.amenities.split(',') : [],
    },
  })

  const onSubmit = (data: FiltersForm) => {
    const params = new URLSearchParams()
    if (data.city)       params.set('city', data.city)
    if (data.capacity)   params.set('capacity', data.capacity)
    if (data.venue_type) params.set('venue_type', data.venue_type)
    if (data.min_price)  params.set('min_price', data.min_price)
    if (data.max_price)  params.set('max_price', data.max_price)
    if (data.amenities?.length) params.set('amenities', data.amenities.join(','))
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleClear = () => {
    reset({ city: '', capacity: '', venue_type: '', min_price: '', max_price: '', amenities: [] })
    router.push(pathname)
  }

  return (
    <div className="card p-5 sticky top-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-900">Filters</h3>
        {Object.values(searchParams).some(Boolean) && (
          <button onClick={handleClear} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <XMarkIcon className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* City */}
        <div>
          <label className="label">City</label>
          <input {...register('city')} className="input" placeholder="e.g. Karachi" />
        </div>

        {/* Date */}
        <div>
          <label className="label">Event date</label>
          <input type="date" className="input" min={new Date().toISOString().split('T')[0]} />
        </div>

        {/* Capacity */}
        <div>
          <label className="label">Min. guests</label>
          <input {...register('capacity')} type="number" className="input" placeholder="e.g. 100" min={1} />
        </div>

        {/* Venue Type */}
        <div>
          <label className="label">Venue type</label>
          <select {...register('venue_type')} className="input">
            <option value="">All types</option>
            {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="label">Hourly rate (PKR)</label>
          <div className="flex gap-2">
            <input {...register('min_price')} type="number" className="input" placeholder="Min" />
            <input {...register('max_price')} type="number" className="input" placeholder="Max" />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="label">Amenities</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {AMENITIES_LIST.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  value={value}
                  {...register('amenities')}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary btn w-full justify-center">
          <MagnifyingGlassIcon className="h-4 w-4" />
          Search
        </button>
      </form>
    </div>
  )
}
