'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import type { Booking } from '@/types'

interface BookingActionsProps {
  booking: Booking
  isManager: boolean
}

export default function BookingActions({ booking, isManager }: BookingActionsProps) {
  const router = useRouter()
  const [notes, setNotes] = useState(booking.manager_notes ?? '')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!isManager || !['pending', 'approved'].includes(booking.status)) return null

  const updateStatus = async (status: 'approved' | 'rejected') => {
    setLoading(status)
    setError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('bookings')
      .update({
        status,
        manager_notes: notes,
        approved_at: status === 'approved' ? new Date().toISOString() : undefined,
        rejected_at: status === 'rejected' ? new Date().toISOString() : undefined,
      })
      .eq('id', booking.id)

    if (error) {
      setError(error.message)
      setLoading(null)
    } else {
      router.refresh()
      setLoading(null)
    }
  }

  return (
    <div className="card p-5 border-2 border-brand-100 bg-brand-50">
      <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <ChatBubbleLeftIcon className="h-5 w-5 text-brand-600" />
        Manager Actions
      </h2>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="mb-4">
        <label className="label">Notes for organizer (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="input min-h-[80px] resize-none text-sm"
          placeholder="Any conditions, instructions, or reasons for your decision…"
        />
      </div>
      {booking.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus('approved')}
            disabled={!!loading}
            className="btn-primary btn flex-1 justify-center"
          >
            <CheckCircleIcon className="h-4 w-4" />
            {loading === 'approved' ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => updateStatus('rejected')}
            disabled={!!loading}
            className="btn-danger btn flex-1 justify-center"
          >
            <XCircleIcon className="h-4 w-4" />
            {loading === 'rejected' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  )
}
