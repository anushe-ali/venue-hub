import type { ComponentType } from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface StatCardProps {
  title: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  color?: string
  change?: number
  trend?: 'up' | 'down'
  subtitle?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = 'brand',
  change,
  trend,
  subtitle,
}: StatCardProps) {
  const colorStyles: Record<string, { bg: string; iconBg: string; iconText: string }> = {
    brand: {
      bg: 'bg-gradient-to-br from-brand-50 to-white',
      iconBg: 'bg-brand-500',
      iconText: 'text-white',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-white',
      iconBg: 'bg-purple-500',
      iconText: 'text-white',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-white',
      iconBg: 'bg-green-500',
      iconText: 'text-white',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-white',
      iconBg: 'bg-blue-500',
      iconText: 'text-white',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-white',
      iconBg: 'bg-amber-500',
      iconText: 'text-white',
    },
    slate: {
      bg: 'bg-gradient-to-br from-slate-50 to-white',
      iconBg: 'bg-slate-500',
      iconText: 'text-white',
    },
  }

  const styles = colorStyles[color] || colorStyles.brand

  return (
    <div className={`rounded-2xl border border-slate-200 p-6 ${styles.bg} transition-all hover:shadow-lg hover:border-slate-300`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${styles.iconBg} rounded-xl p-3 shadow-sm`}>
          <Icon className={`h-6 w-6 ${styles.iconText}`} />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
        <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        {subtitle && <p className="text-sm text-slate-500 mt-2">{subtitle}</p>}
      </div>

      {typeof change !== 'undefined' && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2">
          {trend === 'up' && (
            <>
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">
                +{Math.abs(change)}%
              </span>
            </>
          )}
          {trend === 'down' && (
            <>
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-600">
                {change}%
              </span>
            </>
          )}
          {!trend && (
            <span className="text-sm font-semibold text-slate-600">
              {change > 0 ? `+${change}` : change}%
            </span>
          )}
          <span className="text-xs text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  )
}
