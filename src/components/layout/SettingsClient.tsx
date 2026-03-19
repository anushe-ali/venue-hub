'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { UserCircleIcon, KeyIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ProfileForm {
  full_name: string
  phone: string
  organization: string
}

interface PasswordForm {
  current_password: string
  new_password: string
  confirm_password: string
}

export default function SettingsClient({ profile }: { profile: any }) {
  const router = useRouter()
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      organization: profile?.organization ?? '',
    }
  })

  const passwordForm = useForm<PasswordForm>()

  const saveProfile = async (data: ProfileForm) => {
    setProfileError('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update(data).eq('id', profile.id)
    if (error) { setProfileError(error.message) }
    else { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); router.refresh() }
  }

  const changePassword = async (data: PasswordForm) => {
    setPasswordError('')
    if (data.new_password !== data.confirm_password) {
      setPasswordError('Passwords do not match')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.new_password })
    if (error) { setPasswordError(error.message) }
    else { setPasswordSaved(true); passwordForm.reset(); setTimeout(() => setPasswordSaved(false), 3000) }
  }

  const sectionClass = 'card p-6'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
          <UserCircleIcon className="h-5 w-5 text-slate-400" /> Profile Information
        </h2>
        {profileError && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{profileError}</div>}
        {profileSaved && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" /> Profile updated successfully
          </div>
        )}
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input {...profileForm.register('full_name', { required: true })} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...profileForm.register('phone')} type="tel" className="input" placeholder="+92 300 1234567" />
          </div>
          <div>
            <label className="label">Organization</label>
            <input {...profileForm.register('organization')} className="input" placeholder="Company / organization name" />
          </div>
          <div>
            <label className="label">Role</label>
            <input value={profile?.role ?? ''} disabled className="input capitalize" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={profile?.email ?? ''} disabled className="input text-slate-400" />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" className="btn-primary btn">Save Profile</button>
        </form>
      </div>

      {/* Password */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
          <KeyIcon className="h-5 w-5 text-slate-400" /> Change Password
        </h2>
        {passwordError && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{passwordError}</div>}
        {passwordSaved && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" /> Password changed successfully
          </div>
        )}
        <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input
              {...passwordForm.register('new_password', { required: true, minLength: { value: 8, message: 'Min 8 characters' } })}
              type="password" className="input" placeholder="••••••••"
            />
            {passwordForm.formState.errors.new_password && <p className="form-error">{passwordForm.formState.errors.new_password.message}</p>}
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input {...passwordForm.register('confirm_password', { required: true })} type="password" className="input" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary btn">Update Password</button>
        </form>
      </div>
    </div>
  )
}
