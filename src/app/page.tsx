import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: MagnifyingGlassIcon,
    title: 'Discover Venues',
    desc: 'Search by date, capacity, type, amenities and price. Compare up to 3 venues side by side.',
  },
  {
    icon: CalendarDaysIcon,
    title: 'Real-Time Availability',
    desc: 'Live calendar views with setup & cleanup buffers. Zero double-bookings guaranteed.',
  },
  {
    icon: CreditCardIcon,
    title: 'Secure Payments',
    desc: 'Pay deposits online, track balances, and receive automatic refunds on cancellations.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Conflict Prevention',
    desc: 'Database-level locking ensures only one booking succeeds per time slot.',
  },
]

const stats = [
  { label: 'Venues Listed', value: '200+' },
  { label: 'Events Hosted', value: '5,000+' },
  { label: 'Cities Covered', value: '12' },
  { label: 'Avg. Confirmation', value: '<24h' },
]

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch featured venues
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, city, venue_type, capacity, hourly_rate, photos')
    .eq('is_active', true)
    .limit(6)

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-7 w-7 text-brand-700" />
            <span className="text-xl font-bold text-slate-900">VenueHub</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary btn">Dashboard</Link>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost btn">Sign In</Link>
                <Link href="/auth/register" className="btn-primary btn">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-brand-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
            <StarIcon className="h-4 w-4" />
            Trusted by 5,000+ event organizers
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            Find &amp; Book the Perfect
            <span className="text-brand-700"> Event Venue</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
            VenueHub connects event organizers with local venues. Browse availability in real time,
            book online, and manage everything in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/venues" className="btn-primary btn btn-lg">
              <MagnifyingGlassIcon className="h-5 w-5" />
              Browse Venues
            </Link>
            <Link href="/auth/register?role=manager" className="btn-secondary btn btn-lg">
              List Your Venue
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-brand-700">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-white">{s.value}</div>
              <div className="text-brand-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900">Everything you need to host great events</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            From discovery to confirmation — VenueHub handles the entire booking lifecycle.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="card p-6">
              <div className="h-12 w-12 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-brand-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Venues */}
      {venues && venues.length > 0 && (
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Featured Venues</h2>
                <p className="text-slate-500 mt-2">Handpicked spaces for every occasion</p>
              </div>
              <Link href="/venues" className="btn-secondary btn">View All</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map(v => (
                <Link key={v.id} href={`/venues/${v.id}`} className="card-hover overflow-hidden group">
                  <div className="h-48 bg-slate-200 overflow-hidden">
                    {v.photos?.[0] ? (
                      <img
                        src={v.photos[0]}
                        alt={v.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BuildingOffice2Icon className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{v.name}</h3>
                      <span className="badge bg-brand-50 text-brand-700 shrink-0">{v.venue_type}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{v.city}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Up to {v.capacity} guests</span>
                      <span className="font-semibold text-slate-900">
                        PKR {v.hourly_rate.toLocaleString()}/hr
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4 bg-brand-700 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to book your next venue?</h2>
        <p className="text-brand-200 mb-8 max-w-lg mx-auto">
          Join thousands of event organizers who trust VenueHub for seamless bookings.
        </p>
        <Link href="/auth/register" className="btn bg-white text-brand-700 hover:bg-brand-50 btn-lg">
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 bg-slate-900 text-center text-slate-400 text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <BuildingOffice2Icon className="h-5 w-5 text-brand-400" />
          <span className="font-semibold text-white">VenueHub</span>
        </div>
        <p>© {new Date().getFullYear()} VenueHub. All rights reserved.</p>
      </footer>
    </div>
  )
}
