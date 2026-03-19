'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { BuildingOffice2Icon, EyeIcon, EyeSlashIcon, UserIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface RegisterForm {
  full_name: string
  email: string
  password: string
  confirm_password: string
  organization?: string
  phone?: string
}

type Role = 'organizer' | 'manager'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get('role') as Role) || 'organizer'
  const [role, setRole] = useState<Role>(defaultRole)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()
  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, role, organization: data.organization, phone: data.phone },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <BuildingOffice2Icon className="h-8 w-8 text-brand-700" />
          <span className="text-2xl font-bold text-slate-900">VenueHub</span>
        </Link>

        <div className="card p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="text-slate-500 text-sm mt-1">Join thousands of event organizers and venue managers</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { value: 'organizer', label: 'Event Organizer', desc: 'I want to book venues', Icon: UserIcon },
              { value: 'manager',   label: 'Venue Manager',   desc: 'I manage a venue',      Icon: BuildingStorefrontIcon },
            ] as const).map(({ value, label, desc, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                  role === value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                <Icon className="h-6 w-6" />
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs opacity-70">{desc}</div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full name</label>
                <input
                  {...register('full_name', { required: 'Full name is required' })}
                  className="input" placeholder="Jane Smith"
                />
                {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="label">Email address</label>
                <input
                  {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                  type="email" className="input" placeholder="you@example.com"
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
              {role === 'manager' && (
                <div className="col-span-2">
                  <label className="label">Organization / Venue name</label>
                  <input {...register('organization')} className="input" placeholder="Grand Ballroom Co." />
                </div>
              )}
              <div className="col-span-2">
                <label className="label">Phone (optional)</label>
                <input {...register('phone')} type="tel" className="input" placeholder="+92 300 1234567" />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                    type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  {...register('confirm_password', { required: 'Please confirm', validate: v => v === password || 'Passwords do not match' })}
                  type="password" className="input" placeholder="••••••••"
                />
                {errors.confirm_password && <p className="form-error">{errors.confirm_password.message}</p>}
              </div>
            </div>

            <button type="submit" className="btn-primary btn w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
