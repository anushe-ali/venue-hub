'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePlatformSetting } from '@/lib/adminActions'
import type { PlatformSetting } from '@/types'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface SettingsFormProps {
  settings: PlatformSetting[]
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    settings.forEach(setting => {
      if (typeof setting.value === 'string') {
        initial[setting.key] = setting.value
      } else {
        initial[setting.key] = JSON.stringify(setting.value, null, 2)
      }
    })
    return initial
  })

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async (setting: PlatformSetting) => {
    setLoading(setting.key)
    setError(null)
    setSuccess(null)

    try {
      const rawValue = values[setting.key]
      let parsedValue: unknown = rawValue

      // Try to parse as JSON if it looks like JSON
      if (rawValue.trim().startsWith('{') || rawValue.trim().startsWith('[') ||
          rawValue === 'true' || rawValue === 'false' || !isNaN(Number(rawValue))) {
        try {
          parsedValue = JSON.parse(rawValue)
        } catch {
          // If JSON parse fails, use as string
          parsedValue = rawValue
        }
      }

      const result = await updatePlatformSetting(setting.key, parsedValue)

      if (result.success) {
        setSuccess(setting.key)
        setTimeout(() => {
          router.refresh()
          setSuccess(null)
        }, 2000)
      } else {
        setError(result.error || 'Failed to update setting')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(null)
    }
  }

  const handleReset = (setting: PlatformSetting) => {
    if (typeof setting.value === 'string') {
      setValues(prev => ({ ...prev, [setting.key]: setting.value as string }))
    } else {
      setValues(prev => ({ ...prev, [setting.key]: JSON.stringify(setting.value, null, 2) }))
    }
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {settings.map((setting) => {
        const isModified = typeof setting.value === 'string'
          ? values[setting.key] !== setting.value
          : values[setting.key] !== JSON.stringify(setting.value, null, 2)

        return (
          <div key={setting.key} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
            <div className="mb-3">
              <label htmlFor={setting.key} className="block text-sm font-medium text-slate-900 mb-1">
                {setting.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </label>
              {setting.description && (
                <p className="text-xs text-slate-500">{setting.description}</p>
              )}
            </div>

            <div className="space-y-2">
              {typeof setting.value === 'object' ? (
                <textarea
                  id={setting.key}
                  value={values[setting.key] || ''}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                  className="input font-mono text-xs min-h-[150px]"
                  placeholder="JSON value..."
                />
              ) : (
                <input
                  id={setting.key}
                  type="text"
                  value={values[setting.key] || ''}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                  className="input"
                />
              )}

              {success === setting.key && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Setting updated successfully!</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(setting)}
                  disabled={loading === setting.key || !isModified}
                  className="btn btn-primary btn-sm"
                >
                  {loading === setting.key ? 'Saving...' : 'Save Changes'}
                </button>
                {isModified && (
                  <button
                    type="button"
                    onClick={() => handleReset(setting)}
                    disabled={loading === setting.key}
                    className="btn btn-ghost btn-sm"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
