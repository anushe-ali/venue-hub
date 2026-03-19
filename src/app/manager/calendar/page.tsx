import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManagerCalendar from '@/components/calendar/ManagerCalendar'

export default async function ManagerCalendarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('manager_id', user.id)

  const venueIds = venues?.map(v => v.id) ?? []

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, venue:venues(name, city), organizer:profiles!organizer_id(full_name)')
    .in('venue_id', venueIds)
    .in('status', ['pending', 'approved'])
    .gte('event_date', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0])
    .lte('event_date', new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0).toISOString().split('T')[0])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">All bookings across your venues</p>
        </div>
      </div>
      <ManagerCalendar bookings={bookings ?? []} venues={venues ?? []} />
    </div>
  )
}
