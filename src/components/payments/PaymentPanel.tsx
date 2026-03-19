'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCardIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Booking } from '@/types'

interface PaymentPanelProps {
  booking: Booking
  balance: number
  totalPaid: number
}

export default function PaymentPanel({ booking, balance, totalPaid }: PaymentPanelProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isDepositPaid = totalPaid >= booking.deposit_amount
  const paymentType = !isDepositPaid ? 'deposit' : 'balance'
  const suggestedAmount = !isDepositPaid ? booking.deposit_amount : balance

  const handlePay = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) { setError('Enter a valid amount'); return }
    if (numAmount > balance) { setError(`Amount cannot exceed balance of ${formatCurrency(balance)}`); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: payErr } = await supabase.from('payments').insert({
      booking_id: booking.id,
      payer_id: booking.organizer_id,
      amount: numAmount,
      payment_type: paymentType,
      payment_method: method,
      reference_no: reference || null,
    })

    if (payErr) {
      setError(payErr.message)
      setLoading(false)
      return
    }

    // Update payment_status
    const newPaid = totalPaid + numAmount
    let newStatus = booking.payment_status
    if (newPaid >= booking.total_amount) newStatus = 'fully_paid'
    else if (newPaid >= booking.deposit_amount) newStatus = 'deposit_paid'

    await supabase.from('bookings').update({ payment_status: newStatus }).eq('id', booking.id)

    // Notification
    await supabase.from('notifications').insert({
      user_id: booking.organizer_id,
      type: 'payment_confirmed',
      title: 'Payment Recorded',
      body: `Payment of ${formatCurrency(numAmount)} recorded for your booking.`,
      booking_id: booking.id,
    })

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  if (success) {
    return (
      <div className="card p-5 text-center">
        <CheckCircleIcon className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-slate-900">Payment recorded!</p>
        <p className="text-sm text-slate-500 mt-1">Your payment has been submitted for confirmation.</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
        <CreditCardIcon className="h-5 w-5 text-brand-600" />
        Make a Payment
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        {!isDepositPaid
          ? `Deposit required: ${formatCurrency(booking.deposit_amount)}`
          : `Remaining balance: ${formatCurrency(balance)}`}
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        <div>
          <label className="label">Amount (PKR)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input flex-1"
              placeholder={suggestedAmount.toFixed(0)}
              min={1}
              max={balance}
            />
            <button
              type="button"
              onClick={() => setAmount(suggestedAmount.toFixed(0))}
              className="btn-secondary btn btn-sm whitespace-nowrap"
            >
              Pay {!isDepositPaid ? 'Deposit' : 'Full'}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Payment method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="input">
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online Payment</option>
          </select>
        </div>

        <div>
          <label className="label">Reference number (optional)</label>
          <input
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="input"
            placeholder="Transaction ID, cheque no., etc."
          />
        </div>

        <button onClick={handlePay} disabled={loading || !amount} className="btn-primary btn w-full justify-center">
          {loading ? 'Processing…' : `Submit Payment${amount ? ` · ${formatCurrency(parseFloat(amount) || 0)}` : ''}`}
        </button>
      </div>
    </div>
  )
}
