'use client'

import { useEffect, useRef } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
  loading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  children,
  loading = false,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (dialog && e.target === dialog) {
      onCancel()
    }
  }

  const variantStyles = {
    danger: {
      icon: ShieldExclamationIcon,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      button: 'bg-brand-600 hover:bg-brand-700 text-white',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="backdrop:bg-slate-900/50 rounded-2xl p-0 shadow-2xl border-0 max-w-md w-full"
    >
      <div className="bg-white rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className={`${style.iconBg} rounded-full p-2.5 shrink-0`}>
            <Icon className={`h-6 w-6 ${style.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Additional content (e.g., form inputs) */}
        {children && <div className="px-6 pb-4">{children}</div>}

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${style.button}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </dialog>
  )
}
