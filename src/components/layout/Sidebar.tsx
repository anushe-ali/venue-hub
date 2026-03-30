'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BuildingOffice2Icon,
  HomeIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  BellIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',             label: 'Dashboard',        Icon: HomeIcon,                    roles: ['organizer', 'manager'] },
  { href: '/venues',                label: 'Browse Venues',    Icon: MagnifyingGlassIcon,          roles: ['organizer'] },
  { href: '/bookings',              label: 'My Bookings',      Icon: CalendarDaysIcon,             roles: ['organizer'] },
  { href: '/payments',              label: 'Payments',         Icon: CreditCardIcon,               roles: ['organizer'] },
  { href: '/manager/dashboard',     label: 'Booking Requests', Icon: ClipboardDocumentListIcon,    roles: ['manager'] },
  { href: '/manager/venues',        label: 'My Venues',        Icon: BuildingStorefrontIcon,       roles: ['manager'] },
  { href: '/manager/calendar',      label: 'Calendar',         Icon: CalendarDaysIcon,             roles: ['manager'] },
  { href: '/manager/payments',      label: 'Financials',       Icon: CreditCardIcon,               roles: ['manager'] },
  { href: '/admin',                 label: 'Dashboard',        Icon: HomeIcon,                     roles: ['admin'] },
  { href: '/admin/users',           label: 'Users',            Icon: UsersIcon,                    roles: ['admin'] },
  { href: '/admin/venues',          label: 'All Venues',       Icon: BuildingStorefrontIcon,       roles: ['admin'] },
  { href: '/admin/bookings',        label: 'All Bookings',     Icon: ClipboardDocumentListIcon,    roles: ['admin'] },
  { href: '/admin/analytics',       label: 'Analytics',        Icon: ChartBarIcon,                 roles: ['admin'] },
  { href: '/admin/settings',        label: 'Settings',         Icon: Cog6ToothIcon,                roles: ['admin'] },
  { href: '/admin/audit',           label: 'Audit Log',        Icon: ClipboardDocumentCheckIcon,   roles: ['admin'] },
]

interface SidebarProps {
  userRole: UserRole
  userName: string
  userEmail: string
  unreadCount?: number
}

export function Sidebar({ userRole, userName, userEmail, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const filteredNav = navItems.filter(n => n.roles.includes(userRole))

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-white border-r border-slate-100 flex flex-col z-40 transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <BuildingOffice2Icon className="h-7 w-7 text-brand-700 shrink-0" />
          {!collapsed && <span className="text-lg font-bold text-slate-900 truncate">VenueHub</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {filteredNav.map(({ href, label, Icon }) => {
          // More precise active state detection to avoid multiple highlighted items
          const isExactMatch = pathname === href
          const isSubPath = pathname.startsWith(href + '/') && href !== '/dashboard' && href !== '/admin'
          const active = isExactMatch || isSubPath

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'nav-link',
                active && 'nav-link-active',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {/* Notifications - Only for non-admin users */}
        {userRole !== 'admin' && (
          <Link
            href="/notifications"
            title={collapsed ? 'Notifications' : undefined}
            className={cn('nav-link relative', collapsed && 'justify-center px-2')}
          >
            <BellIcon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">Notifications</span>}
            {unreadCount > 0 && (
              <span className={cn(
                'absolute bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center',
                collapsed ? 'top-1 right-1 h-4 w-4' : 'right-2 h-5 w-5'
              )}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* Settings - Only for non-admin users */}
        {userRole !== 'admin' && (
          <Link href="/settings" title={collapsed ? 'Settings' : undefined} className={cn('nav-link', collapsed && 'justify-center px-2')}>
            <Cog6ToothIcon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">Settings</span>}
          </Link>
        )}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-slate-100 p-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-xl hover:bg-slate-50">
            <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
        )}
        <button onClick={handleSignOut} title="Sign out" className={cn('nav-link w-full text-red-500 hover:bg-red-50 hover:text-red-600', collapsed && 'justify-center px-2')}>
          <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-link w-full justify-center mt-1 text-slate-400"
        >
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
