'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { VENUE_TYPES, AMENITIES_LIST } from '@/lib/utils'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { Venue, VenueEquipment, VenueLayout } from '@/types'

interface VenueFormData {
  name: string
  venue_type: string
  description: string
  address: string
  city: string
  state: string
  country: string
  capacity: number
  hourly_rate: number
  full_day_rate: number
  deposit_percent: number
  tax_percent: number
  amenities: string[]
  policies: string
  setup_buffer_mins: number
  cleanup_buffer_mins: number
  is_active: boolean
}

interface VenueFormProps {
  userId: string
  venue?: Venue & { equipment: VenueEquipment[]; layouts: VenueLayout[] }
}

export default function VenueForm({ userId, venue }: VenueFormProps) {
  const router = useRouter()
  const isEdit = !!venue
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<string[]>(venue?.photos ?? [])
  const [newPhoto, setNewPhoto] = useState('')
  const [equipment, setEquipment] = useState<Partial<VenueEquipment>[]>(venue?.equipment ?? [])
  const [layouts, setLayouts] = useState<Partial<VenueLayout>[]>(venue?.layouts ?? [])

  const { register, handleSubmit, watch, formState: { errors } } = useForm<VenueFormData>({
    defaultValues: {
      name: venue?.name ?? '',
      venue_type: venue?.venue_type ?? '',
      description: venue?.description ?? '',
      address: venue?.address ?? '',
      city: venue?.city ?? '',
      state: venue?.state ?? '',
      country: venue?.country ?? 'Pakistan',
      capacity: venue?.capacity ?? 100,
      hourly_rate: venue?.hourly_rate ?? 5000,
      full_day_rate: venue?.full_day_rate ?? 0,
      deposit_percent: venue?.deposit_percent ?? 30,
      tax_percent: venue?.tax_percent ?? 0,
      amenities: venue?.amenities ?? [],
      policies: venue?.policies ?? '',
      setup_buffer_mins: venue?.setup_buffer_mins ?? 60,
      cleanup_buffer_mins: venue?.cleanup_buffer_mins ?? 60,
      is_active: venue?.is_active ?? true,
    }
  })

  const onSubmit = async (data: VenueFormData) => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const payload = { ...data, manager_id: userId, photos }

    let venueId = venue?.id
    if (isEdit) {
      const { error } = await supabase.from('venues').update(payload).eq('id', venue.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { data: newVenue, error } = await supabase.from('venues').insert(payload).select('id').single()
      if (error) { setError(error.message); setLoading(false); return }
      venueId = newVenue.id
    }

    // Upsert equipment
    if (venueId) {
      if (isEdit) await supabase.from('venue_equipment').delete().eq('venue_id', venueId)
      const validEq = equipment.filter(e => e.name)
      if (validEq.length > 0) {
        await supabase.from('venue_equipment').insert(validEq.map(e => ({
          venue_id: venueId, name: e.name!, description: e.description ?? '', fee: e.fee ?? 0, is_available: true,
        })))
      }

      // Upsert layouts
      if (isEdit) await supabase.from('venue_layouts').delete().eq('venue_id', venueId)
      const validLayouts = layouts.filter(l => l.name && l.capacity)
      if (validLayouts.length > 0) {
        await supabase.from('venue_layouts').insert(validLayouts.map(l => ({
          venue_id: venueId, name: l.name!, capacity: l.capacity!, description: l.description ?? '',
        })))
      }
    }

    router.push('/manager/venues')
    router.refresh()
  }

  const addPhoto = () => {
    if (newPhoto.trim()) { setPhotos([...photos, newPhoto.trim()]); setNewPhoto('') }
  }

  const sectionClass = 'card p-6 space-y-5'
  const sectionTitle = 'text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Basic Info */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Basic Information</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label">Venue name *</label>
            <input {...register('name', { required: 'Required' })} className="input" placeholder="e.g. Grand Ballroom at Pearl Continental" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Venue type *</label>
            <select {...register('venue_type', { required: 'Required' })} className="input">
              <option value="">Select type…</option>
              {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.venue_type && <p className="form-error">{errors.venue_type.message}</p>}
          </div>
          <div>
            <label className="label">Max capacity *</label>
            <input {...register('capacity', { required: 'Required', min: 1 })} type="number" className="input" placeholder="500" />
            {errors.capacity && <p className="form-error">{errors.capacity.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea {...register('description')} className="input min-h-[100px] resize-none" placeholder="Describe your venue, its ambiance, and what makes it special…" />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Location</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label">Street address *</label>
            <input {...register('address', { required: 'Required' })} className="input" placeholder="123 Main Street" />
            {errors.address && <p className="form-error">{errors.address.message}</p>}
          </div>
          <div>
            <label className="label">City *</label>
            <input {...register('city', { required: 'Required' })} className="input" placeholder="Karachi" />
            {errors.city && <p className="form-error">{errors.city.message}</p>}
          </div>
          <div>
            <label className="label">State / Province</label>
            <input {...register('state')} className="input" placeholder="Sindh" />
          </div>
          <div>
            <label className="label">Country</label>
            <input {...register('country')} className="input" placeholder="Pakistan" />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Pricing & Policies</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <label className="label">Hourly rate (PKR) *</label>
            <input {...register('hourly_rate', { required: 'Required', min: 0 })} type="number" className="input" placeholder="5000" />
          </div>
          <div>
            <label className="label">Full day rate (PKR)</label>
            <input {...register('full_day_rate', { min: 0 })} type="number" className="input" placeholder="30000" />
          </div>
          <div>
            <label className="label">Deposit % *</label>
            <input {...register('deposit_percent', { required: 'Required', min: 0, max: 100 })} type="number" className="input" placeholder="30" />
          </div>
          <div>
            <label className="label">Tax %</label>
            <input {...register('tax_percent', { min: 0 })} type="number" step="0.5" className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Setup buffer (mins)</label>
            <input {...register('setup_buffer_mins', { min: 0 })} type="number" className="input" placeholder="60" />
          </div>
          <div>
            <label className="label">Cleanup buffer (mins)</label>
            <input {...register('cleanup_buffer_mins', { min: 0 })} type="number" className="input" placeholder="60" />
          </div>
        </div>
        <div>
          <label className="label">Venue policies</label>
          <textarea {...register('policies')} className="input min-h-[80px] resize-none" placeholder="No alcohol, outside catering allowed, noise curfew at 10pm, etc." />
        </div>
      </div>

      {/* Amenities */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Amenities</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AMENITIES_LIST.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" value={value} {...register('amenities')} className="rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Photos</h2>
        <div className="space-y-3">
          {photos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <img src={p} alt="" className="h-10 w-16 object-cover rounded-lg bg-slate-100" onError={e => { (e.target as any).src = '' }} />
              <span className="flex-1 text-xs text-slate-500 truncate">{p}</span>
              <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={newPhoto} onChange={e => setNewPhoto(e.target.value)} className="input flex-1" placeholder="https://… paste photo URL" />
            <button type="button" onClick={addPhoto} className="btn-secondary btn btn-sm"><PlusIcon className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Equipment */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Equipment & Add-ons</h2>
        <div className="space-y-3">
          {equipment.map((eq, i) => (
            <div key={i} className="flex gap-3 items-start">
              <input
                value={eq.name ?? ''}
                onChange={e => setEquipment(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                className="input flex-1" placeholder="Equipment name"
              />
              <input
                type="number" value={eq.fee ?? 0}
                onChange={e => setEquipment(prev => prev.map((x, j) => j === i ? { ...x, fee: parseFloat(e.target.value) } : x))}
                className="input w-28" placeholder="Fee (PKR)"
              />
              <button type="button" onClick={() => setEquipment(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-2.5">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setEquipment([...equipment, { name: '', fee: 0 }])} className="btn-secondary btn btn-sm">
            <PlusIcon className="h-4 w-4" /> Add equipment
          </button>
        </div>
      </div>

      {/* Layouts */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>Seating Layouts</h2>
        <div className="space-y-3">
          {layouts.map((l, i) => (
            <div key={i} className="flex gap-3 items-start">
              <input
                value={l.name ?? ''}
                onChange={e => setLayouts(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                className="input flex-1" placeholder="Layout name (e.g. Theatre, Banquet)"
              />
              <input
                type="number" value={l.capacity ?? ''}
                onChange={e => setLayouts(prev => prev.map((x, j) => j === i ? { ...x, capacity: parseInt(e.target.value) } : x))}
                className="input w-28" placeholder="Capacity"
              />
              <button type="button" onClick={() => setLayouts(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-2.5">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLayouts([...layouts, { name: '', capacity: 0 }])} className="btn-secondary btn btn-sm">
            <PlusIcon className="h-4 w-4" /> Add layout
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900">Listing status</div>
          <div className="text-sm text-slate-500">Toggle to show or hide this venue from search results</div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('is_active')} className="rounded border-slate-300 text-brand-600 focus:ring-brand-400 h-4 w-4" />
          <span className="text-sm font-medium text-slate-700">Active / Listed</span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="btn-secondary btn flex-1 justify-center">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary btn flex-1 justify-center">
          {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Venue')}
        </button>
      </div>
    </form>
  )
}
