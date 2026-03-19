'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

export default function CancelBookingClient({
  booking, refundAmount
}: { booking: any; refundAmount: number }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    if (!reason.trim()) { setError('Please provide a cancellation reason'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (err) { setError(err.message); setLoading(false); return }

    if (refundAmount > 0) {
      await supabase.from('payments').insert({
        booking_id: booking.id,
        payer_id: booking.organizer_id,
        amount: refundAmount,
        payment_type: 'refund',
        notes: `Refund on cancellation: ${reason}`,
      })
      await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', booking.id)
    }

    router.push(`/bookings/${booking.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href={`/bookings/${booking.id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeftIcon className="h-4 w-4" /> Back to booking
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Cancel Booking</h1>
            <p className="text-sm text-slate-500">{booking.event_name}</p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-5 text-sm text-amber-800">
          <p className="font-medium mb-1">Before you cancel</p>
          <p>Total paid so far will be partially refunded based on the venue&apos;s cancellation policy.</p>
          {refundAmount > 0 ? (
            <p className="mt-2 font-semibold text-green-700">Estimated refund: {formatCurrency(refundAmount)}</p>
          ) : (
            <p className="mt-2 font-semibold text-red-700">No refund applicable based on cancellation timing.</p>
          )}
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-5">
          <label className="label">Reason for cancellation *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="input min-h-[100px] resize-none"
            placeholder="Please provide a reason for cancelling this booking…"
          />
        </div>

        <div className="flex gap-3">
          <Link href={`/bookings/${booking.id}`} className="btn-secondary btn flex-1 justify-center">Keep Booking</Link>
          <button onClick={handleCancel} disabled={loading} className="btn-danger btn flex-1 justify-center">
            {loading ? 'Cancelling…' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}
