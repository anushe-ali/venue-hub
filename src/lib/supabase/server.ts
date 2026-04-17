import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: any) {
          const cookieStore = await cookies()
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Called from a Server Component — ignore
          }
        },
        async remove(name: string, options: any) {
          const cookieStore = await cookies()
          try {
            cookieStore.set(name, '', options)
          } catch {
            // Called from a Server Component — ignore
          }
        },
      },
    }
  )
}
