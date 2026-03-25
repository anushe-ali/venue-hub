import { ClockIcon } from '@heroicons/react/24/outline'
import { formatDate, formatTime, formatRelative, getStatusColor } from '@/lib/utils'
import type { BookingModification } from '@/types'

interface ModificationHistoryProps {
  modifications: BookingModification[]
}

export default function ModificationHistory({ modifications }: ModificationHistoryProps) {
  if (!modifications.length) return null

  return (
    <div className="card p-5">
      <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
        <ClockIcon className="h-5 w-5 text-slate-400" />
        Modification History
      </h3>
      <div className="space-y-4">
        {modifications.map(mod => (
          <div key={mod.id} className="border-l-2 border-slate-200 pl-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge text-xs ${getStatusColor(mod.status)}`}>
                {mod.status.charAt(0).toUpperCase() + mod.status.slice(1)}
              </span>
              <span className="text-xs text-slate-500">
                {formatRelative(mod.created_at)}
              </span>
            </div>
            <div className="text-sm text-slate-700 mb-1">
              <span className="text-slate-500">From:</span>{' '}
              {formatDate(mod.old_event_date)} • {formatTime(mod.old_start_time)} - {formatTime(mod.old_end_time)}
            </div>
            <div className="text-sm text-slate-700 mb-1">
              <span className="text-slate-500">To:</span>{' '}
              {formatDate(mod.new_event_date!)} • {formatTime(mod.new_start_time!)} - {formatTime(mod.new_end_time!)}
            </div>
            <p className="text-xs text-slate-600 italic mb-1">"{mod.reason}"</p>
            {mod.reviewer_notes && (
              <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-2">
                <p className="text-xs font-medium text-blue-900">Manager Response:</p>
                <p className="text-xs text-blue-700">{mod.reviewer_notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
