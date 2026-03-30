import { createClient } from '@/lib/supabase/server'
import type { PlatformSetting } from '@/types'

/**
 * Retrieve a specific platform setting by key
 *
 * @param key - The setting key to retrieve
 * @returns The setting value or null if not found
 *
 * @example
 * const fee = await getPlatformSetting<number>('platform_fee_percentage')
 * const methods = await getPlatformSetting<string[]>('payment_methods')
 */
export async function getPlatformSetting<T = unknown>(key: string): Promise<T | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single()

  return data?.value as T ?? null
}

/**
 * Retrieve all platform settings, optionally filtered by category
 *
 * @param category - Optional category filter ('fees', 'policies', 'payment', 'email', 'system')
 * @returns Array of platform settings
 *
 * @example
 * const feeSettings = await getAllSettings('fees')
 * const allSettings = await getAllSettings()
 */
export async function getAllSettings(category?: string): Promise<PlatformSetting[]> {
  const supabase = createClient()

  let query = supabase
    .from('platform_settings')
    .select('*')
    .order('category, key')

  if (category) {
    query = query.eq('category', category)
  }

  const { data } = await query

  return data as PlatformSetting[] ?? []
}

/**
 * Get multiple settings by their keys
 * Returns an object with keys as property names and values as values
 *
 * @param keys - Array of setting keys to retrieve
 * @returns Object mapping keys to their values
 *
 * @example
 * const { platform_fee_percentage, min_deposit_percentage } =
 *   await getSettingsByKeys(['platform_fee_percentage', 'min_deposit_percentage'])
 */
export async function getSettingsByKeys(keys: string[]): Promise<Record<string, unknown>> {
  const supabase = createClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', keys)

  if (!data) return {}

  return data.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, unknown>)
}
