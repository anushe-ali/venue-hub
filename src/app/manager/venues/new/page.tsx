import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenueForm from '@/components/venues/VenueForm'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function NewVenuePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/manager/venues" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeftIcon className="h-4 w-4" /> Back to My Venues
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add New Venue</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details to list your venue on VenueHub</p>
      </div>
      <VenueForm userId={user.id} />
    </div>
  )
}
