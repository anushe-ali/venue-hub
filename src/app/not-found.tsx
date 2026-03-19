import Link from 'next/link'
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold text-slate-200 mb-4">404</div>
        <BuildingOffice2Icon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary btn">Go to Dashboard</Link>
          <Link href="/" className="btn-secondary btn">Home</Link>
        </div>
      </div>
    </div>
  )
}
