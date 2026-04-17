import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatRelative, getStatusColor } from '@/lib/utils'
import { CreditCardIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default async function OrganizerPaymentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, venue:venues(name), payments(*)')
    .eq('organizer_id', user.id)
    .in('status', ['approved', 'pending', 'completed'])
    .order('event_date', { ascending: false })

  const allPayments = (bookings ?? []).flatMap((b: any) =>
    (b.payments ?? []).map((p: any) => ({ ...p, booking: b }))
  ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalPaid     = allPayments.filter((p: any) => p.payment_type !== 'refund').reduce((s: number, p: any) => s + p.amount, 0)
  const totalRefunded = allPayments.filter((p: any) => p.payment_type === 'refund').reduce((s: number, p: any) => s + p.amount, 0)
  const totalOutstanding = (bookings ?? []).reduce((s: number, b: any) => {
    const paid = (b.payments ?? []).filter((p: any) => p.payment_type !== 'refund').reduce((ps: number, p: any) => ps + p.amount, 0)
    return s + Math.max(0, b.total_amount - paid)
  }, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Your payment history and outstanding balances</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Paid',    value: formatCurrency(totalPaid),        color: 'bg-green-50 text-green-700' },
          { label: 'Outstanding',   value: formatCurrency(totalOutstanding),  color: 'bg-amber-50 text-amber-700' },
          { label: 'Refunded',      value: formatCurrency(totalRefunded),     color: 'bg-blue-50 text-blue-700'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5">
            <div className="text-xl font-bold text-slate-900">{value}</div>
            <div className={`text-sm font-medium mt-1 inline-flex px-2 py-0.5 rounded-full ${color}`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bookings with payment breakdown */}
      <div className="card mb-6">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Booking Payments</h2>
        </div>
        {!(bookings ?? []).length ? (
          <div className="p-12 text-center text-slate-400">
            <CreditCardIcon className="h-12 w-12 mx-auto mb-3" />
            <p>No payment activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(bookings ?? []).map((b: any) => {
              const paid = (b.payments ?? []).filter((p: any) => p.payment_type !== 'refund').reduce((s: number, p: any) => s + p.amount, 0)
              const balance = b.total_amount - paid
              return (
                <div key={b.id} className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{b.event_name}</div>
                    <div className="text-sm text-slate-500">{b.venue?.name} · {formatDate(b.event_date)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge text-xs ${getStatusColor(b.payment_status)}`}>{b.payment_status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(b.total_amount)} total</div>
                    <div className="text-xs text-green-600">Paid: {formatCurrency(paid)}</div>
                    {balance > 0 && <div className="text-xs text-red-500">Due: {formatCurrency(balance)}</div>}
                  </div>
                  <Link href={`/bookings/${b.id}`} className="btn-secondary btn btn-sm shrink-0">
                    {balance > 0 && b.status === 'approved' ? 'Pay Now' : 'View'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transaction history */}
      {allPayments.length > 0 && (
        <div className="card">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Transaction History</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {allPayments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 capitalize">
                    {p.payment_type.replace('_', ' ')} — {p.booking?.event_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatRelative(p.created_at)} · {p.payment_method?.replace('_', ' ') ?? 'Unknown'}
                    {p.reference_no ? ` · Ref: ${p.reference_no}` : ''}
                  </div>
                </div>
                <span className={`font-bold ${p.payment_type === 'refund' ? 'text-blue-600' : 'text-green-600'}`}>
                  {p.payment_type === 'refund' ? '−' : '+'}{formatCurrency(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
