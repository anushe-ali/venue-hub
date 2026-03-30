'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types'
import { updateUserRole } from '@/lib/adminActions'
import { ConfirmationDialog } from './ConfirmationDialog'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface UserRoleEditorProps {
  userId: string
  currentRole: UserRole
  userName: string
}

export function UserRoleEditor({ userId, currentRole, userName }: UserRoleEditorProps) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole)
  const [reason, setReason] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const roles: Array<{ value: UserRole; label: string; description: string }> = [
    {
      value: 'organizer',
      label: 'Event Organizer',
      description: 'Can book venues and manage their own bookings',
    },
    {
      value: 'manager',
      label: 'Venue Manager',
      description: 'Can add venues and manage booking requests',
    },
    {
      value: 'admin',
      label: 'Administrator',
      description: 'Full access to platform management and settings',
    },
  ]

  const handleSubmit = () => {
    if (selectedRole === currentRole) {
      setError('Please select a different role')
      return
    }
    if (!reason.trim()) {
      setError('Please provide a reason for this change')
      return
    }
    setError(null)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    const result = await updateUserRole(userId, selectedRole, reason)

    setLoading(false)
    setShowConfirm(false)

    if (result.success) {
      setSuccess(true)
      setReason('')
      setTimeout(() => {
        router.refresh()
        setSuccess(false)
      }, 2000)
    } else {
      setError(result.error || 'Failed to update role')
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Change User Role</h3>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4" />
          Role updated successfully!
        </div>
      )}

      <div className="space-y-3 mb-4">
        {roles.map((role) => (
          <label
            key={role.value}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedRole === role.value
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={selectedRole === role.value}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="mt-0.5 h-4 w-4 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 flex items-center gap-2">
                {role.label}
                {role.value === currentRole && (
                  <span className="badge bg-slate-100 text-slate-600 text-xs">Current</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mb-4">
        <label htmlFor="reason" className="label">
          Reason for Change <span className="text-red-500">*</span>
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Explain why this role change is necessary..."
          required
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={selectedRole === currentRole || loading}
        className="btn btn-primary"
      >
        {loading ? 'Updating...' : 'Update Role'}
      </button>

      <ConfirmationDialog
        isOpen={showConfirm}
        title="Confirm Role Change"
        message={`Are you sure you want to change ${userName}'s role from ${currentRole} to ${selectedRole}? This will change their access permissions immediately.`}
        confirmText="Change Role"
        variant="warning"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </div>
  )
}
