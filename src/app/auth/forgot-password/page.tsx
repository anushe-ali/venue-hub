'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { BuildingOffice2Icon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>()

  const onSubmit = async ({ email }: { email: string }) => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <BuildingOffice2Icon className="h-8 w-8 text-brand-700" />
          <span className="text-2xl font-bold text-slate-900">VenueHub</span>
        </Link>
        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm mb-6">
                We've sent a password reset link to your email address.
              </p>
              <Link href="/auth/login" className="btn-primary btn w-full justify-center">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
                <p className="text-slate-500 text-sm mt-1">Enter your email and we'll send you a reset link.</p>
              </div>
              {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                    type="email" className="input" placeholder="you@example.com"
                  />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>
                <button type="submit" className="btn-primary btn w-full justify-center" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                <Link href="/auth/login" className="text-brand-600 hover:text-brand-700">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
