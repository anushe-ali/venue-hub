import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenueForm from '@/components/venues/VenueForm'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default async function EditVenuePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: venue } = await supabase
    .from('venues')
    .select('*, equipment:venue_equipment(*), layouts:venue_layouts(*)')
    .eq('id', params.id)
    .single()

  if (!venue) notFound()

  // Only the manager or admin can edit
  if (venue.manager_id !== user.id && profile?.role !== 'admin') redirect('/manager/venues')

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/manager/venues" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeftIcon className="h-4 w-4" /> Back to My Venues
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Venue</h1>
        <p className="text-slate-500 text-sm mt-1">{venue.name}</p>
      </div>
      <VenueForm userId={user.id} venue={venue as any} />
    </div>
  )
}
