import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils'
import { CurrencyDollarIcon, ArrowTrendingUpIcon, BanknotesIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ManagerPaymentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: venues } = await supabase.from('venues').select('id').eq('manager_id', user.id)
  const venueIds = venues?.map(v => v.id) ?? []

  // Get all bookings for these venues with payments
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, venue:venues(name), organizer:profiles!organizer_id(full_name), payments(*)')
    .in('venue_id', venueIds)
    .in('status', ['approved', 'completed'])
    .order('created_at', { ascending: false })

  const allPayments = (bookings ?? []).flatMap((b: any) =>
    (b.payments ?? []).map((p: any) => ({ ...p, booking: b }))
  ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalRevenue  = allPayments.filter((p: any) => p.payment_type !== 'refund').reduce((s: number, p: any) => s + p.amount, 0)
  const totalRefunded = allPayments.filter((p: any) => p.payment_type === 'refund').reduce((s: number, p: any) => s + p.amount, 0)
  const netRevenue    = totalRevenue - totalRefunded

  const pendingBalance = (bookings ?? []).reduce((s: number, b: any) => {
    const paid = (b.payments ?? []).filter((p: any) => p.payment_type !== 'refund').reduce((ps: number, p: any) => ps + p.amount, 0)
    const refunded = (b.payments ?? []).filter((p: any) => p.payment_type === 'refund').reduce((ps: number, p: any) => ps + p.amount, 0)
    return s + Math.max(0, b.total_amount - paid + refunded)
  }, 0)

  const stats = [
    { label: 'Total Collected',   value: formatCurrency(totalRevenue),  Icon: BanknotesIcon,       color: 'bg-green-50 text-green-700' },
    { label: 'Net Revenue',       value: formatCurrency(netRevenue),     Icon: ArrowTrendingUpIcon,  color: 'bg-brand-50 text-brand-700' },
    { label: 'Outstanding',       value: formatCurrency(pendingBalance), Icon: CurrencyDollarIcon,   color: 'bg-amber-50 text-amber-700' },
    { label: 'Total Refunded',    value: formatCurrency(totalRefunded),  Icon: ReceiptRefundIcon,    color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financials</h1>
          <p className="page-subtitle">Revenue and payment tracking across your venues</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Bookings with payment status */}
      <div className="card mb-8">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Confirmed Bookings</h2>
        </div>
        {!(bookings ?? []).length ? (
          <div className="p-12 text-center text-slate-400">No confirmed bookings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Event</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Venue</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Total</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Paid</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-500">Balance</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(bookings ?? []).map((b: any) => {
                  const paid = (b.payments ?? []).filter((p: any) => p.payment_type !== 'refund').reduce((s: number, p: any) => s + p.amount, 0)
                  const refunded = (b.payments ?? []).filter((p: any) => p.payment_type === 'refund').reduce((s: number, p: any) => s + p.amount, 0)
                  const balance = b.total_amount - paid + refunded
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900">{b.event_name}</div>
                        <div className="text-xs text-slate-400">{b.organizer?.full_name}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{b.venue?.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(b.event_date)}</td>
                      <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(b.total_amount)}</td>
                      <td className="px-5 py-3.5 text-right text-green-600 font-medium">{formatCurrency(paid)}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/bookings/${b.id}`} className="btn-ghost btn btn-sm">View</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent payments */}
      <div className="card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Transactions</h2>
        </div>
        {!allPayments.length ? (
          <div className="p-12 text-center text-slate-400">No payment transactions yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {allPayments.slice(0, 20).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-medium text-slate-900 text-sm capitalize">
                    {p.payment_type.replace('_', ' ')} — {p.booking?.event_name}
                  </div>
                  <div className="text-xs text-slate-400">{formatRelative(p.created_at)} · {p.payment_method ?? 'Unknown method'}</div>
                  {p.reference_no && <div className="text-xs text-slate-400">Ref: {p.reference_no}</div>}
                </div>
                <div className={`text-base font-bold ${p.payment_type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                  {p.payment_type === 'refund' ? '−' : '+'}{formatCurrency(p.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
