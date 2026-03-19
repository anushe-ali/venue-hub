import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingForm from '@/components/bookings/BookingForm'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default async function BookVenuePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/venues/${params.id}/book`)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'organizer') redirect('/dashboard')

  const { data: venue } = await supabase
    .from('venues')
    .select('*, equipment:venue_equipment(*), layouts:venue_layouts(*)')
    .eq('id', params.id)
    .eq('is_active', true)
    .single()

  if (!venue) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/venues/${params.id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to {venue.name}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Book {venue.name}</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details below to submit your booking request</p>
      </div>
      <BookingForm venue={venue as any} userId={user.id} />
    </div>
  )
}
