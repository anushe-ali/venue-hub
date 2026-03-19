'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckIcon } from '@heroicons/react/24/outline'

export default function MarkAllReadButton({ userId }: { userId: string }) {
  const router = useRouter()
  const handle = async () => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    router.refresh()
  }
  return (
    <button onClick={handle} className="btn-secondary btn btn-sm flex items-center gap-1.5">
      <CheckIcon className="h-4 w-4" /> Mark all read
    </button>
  )
}
