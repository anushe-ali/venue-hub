import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { getAllSettings } from '@/lib/settings'

export default async function AdminSettingsPage() {
  const supabase = createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch all settings
  const allSettings = await getAllSettings()

  // Group settings by category
  const settingsByCategory = allSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, typeof allSettings>)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Settings</h1>
          <p className="page-subtitle">Configure platform-wide settings and policies</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Fee Settings */}
        {settingsByCategory.fees && (
          <div className="card">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Fee Settings</h2>
              <p className="text-sm text-slate-500 mt-1">Configure platform commission and deposit requirements</p>
            </div>
            <SettingsForm settings={settingsByCategory.fees} />
          </div>
        )}

        {/* Policy Settings */}
        {settingsByCategory.policies && (
          <div className="card">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Policy Settings</h2>
              <p className="text-sm text-slate-500 mt-1">Manage cancellation policies and booking rules</p>
            </div>
            <SettingsForm settings={settingsByCategory.policies} />
          </div>
        )}

        {/* Payment Settings */}
        {settingsByCategory.payment && (
          <div className="card">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Payment Settings</h2>
              <p className="text-sm text-slate-500 mt-1">Configure payment methods and gateway settings</p>
            </div>
            <SettingsForm settings={settingsByCategory.payment} />
          </div>
        )}

        {/* Email Settings */}
        {settingsByCategory.email && (
          <div className="card">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
              <p className="text-sm text-slate-500 mt-1">Customize email templates sent to users</p>
            </div>
            <SettingsForm settings={settingsByCategory.email} />
          </div>
        )}

        {/* System Settings */}
        {settingsByCategory.system && (
          <div className="card">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">System Settings</h2>
              <p className="text-sm text-slate-500 mt-1">Configure system-wide preferences</p>
            </div>
            <SettingsForm settings={settingsByCategory.system} />
          </div>
        )}
      </div>
    </div>
  )
}
