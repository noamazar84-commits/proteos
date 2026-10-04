import { Link, useNavigate } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { Logo } from './Logo'
import { showAdminLink } from '@/lib/integrations'
import { useAppState } from '@/lib/store'
import { signInWithDevelopmentAdmin } from '@/lib/auth'

export function SiteNav() {
  const developmentPreview = import.meta.env.DEV
  const navigate = useNavigate()
  const { user } = useAppState()
  const openDashboard = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!developmentPreview) return
    event.preventDefault()
    try {
      if (!user) await signInWithDevelopmentAdmin()
    } finally {
      navigate({ to: '/app' })
    }
  }

  return (
    <header className="relative z-20 flex w-full shrink-0 items-center justify-between px-5 pb-2 pt-5 sm:px-8 sm:pb-3 sm:pt-6">
      <Link
        to={developmentPreview ? '/app' : '/'}
        onClick={(event) => { void openDashboard(event) }}
        aria-label={developmentPreview ? 'Open Proteus dashboard' : 'Proteus home'}
        title={developmentPreview ? 'Open dashboard' : 'Proteus home'}
        className="transition-opacity hover:opacity-80"
      >
        <Logo size="sm" />
      </Link>
      <nav className="ml-auto flex items-center">
        <AdminLink />
      </nav>
    </header>
  )
}

export function AdminLink() {
  const { user } = useAppState()
  const navigate = useNavigate()
  const developmentPreview = import.meta.env.DEV
  if (!developmentPreview && !showAdminLink(user)) return null

  const adminClassName = 'flex items-center gap-1.5 rounded-full border border-volt/50 bg-volt/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-volt-2 hover:bg-volt/20'
  if (developmentPreview && !user) {
    return (
      <button
        type="button"
        aria-label="Open Admin Manager with development mock login"
        title="Development mock admin login"
        className={adminClassName}
        onClick={async () => {
          try {
            await signInWithDevelopmentAdmin()
            navigate({ to: '/admin' })
          } catch {
            window.location.assign('/admin')
          }
        }}
      >
        <Shield className="h-3.5 w-3.5 text-volt-2" /> Admin Manager
      </button>
    )
  }

  return (
    <Link to="/admin" aria-label="Open Admin Manager" title="Admin Manager" className={adminClassName}>
      <Shield className="h-3.5 w-3.5 text-volt-2" /> Admin Manager
    </Link>
  )
}
