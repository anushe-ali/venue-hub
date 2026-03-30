'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleUserStatus } from '@/lib/adminActions'
import { ConfirmationDialog } from './ConfirmationDialog'
import { CheckCircleIcon, ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'

interface UserStatusToggleProps {
  userId: string
  isActive: boolean
  userName: string
  userRole: string
}

export function UserStatusToggle({ userId, isActive, userName, userRole }: UserStatusToggleProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleToggle = () => {
    setReason('')
    setError(null)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason')
      return
    }

    setLoading(true)
    setError(null)

    const result = await toggleUserStatus(userId, reason)

    setLoading(false)

    if (result.success) {
      setShowConfirm(false)
      setSuccess(true)
      setReason('')
      setTimeout(() => {
        router.refresh()
        setSuccess(false)
      }, 2000)
    } else {
      setError(result.error || 'Failed to update status')
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Status</h3>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4" />
          Status updated successfully!
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isActive ? (
            <>
              <div className="bg-green-100 rounded-full p-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Active Account</p>
                <p className="text-sm text-slate-500">User can log in and access the platform</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-100 rounded-full p-2">
                <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Inactive Account</p>
                <p className="text-sm text-slate-500">User cannot log in to the platform</p>
              </div>
            </>
          )}
        </div>
        <span className={`badge ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
      >
        {loading ? 'Processing...' : isActive ? 'Deactivate Account' : 'Activate Account'}
      </button>

      <ConfirmationDialog
        isOpen={showConfirm}
        title={isActive ? 'Deactivate Account' : 'Activate Account'}
        message={
          isActive
            ? `This will prevent ${userName} from logging in. Active bookings will not be affected, but they won't be able to create new ones or access their account.`
            : `This will restore access for ${userName}. They will be able to log in and use the platform again.`
        }
        confirmText={isActive ? 'Deactivate' : 'Activate'}
        variant={isActive ? 'danger' : 'info'}
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirm(false)
          setError(null)
        }}
        loading={loading}
      >
        <div>
          <label htmlFor="status-reason" className="label">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="status-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input min-h-[100px]"
            placeholder={
              isActive
                ? 'Explain why this account should be deactivated...'
                : 'Explain why this account should be reactivated...'
            }
            required
          />
          {error && <p className="form-error mt-1">{error}</p>}
        </div>
      </ConfirmationDialog>
    </div>
  )
}
