import { useEffect, type ReactNode } from 'react'
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { loadCurrentSession } from '@/lib/auth'
import { actions } from '@/lib/store'
import '../styles.css'

const siteName = 'Proteus — Adaptive protein-first coaching'
const siteDescription =
  'Three pathways, a protein target that fits your appetite, and a new 30-day plan every month rebuilt from your real progress.'
const configuredOrigin = typeof process !== 'undefined' ? process.env.PUBLIC_APP_ORIGIN?.trim() : undefined
const canonicalUrl = (() => {
  if (!configuredOrigin) return undefined
  try { return new URL('/', configuredOrigin).toString() } catch { return undefined }
})()

export const Route = createRootRoute({
  notFoundComponent: () => <div className="stage grid min-h-dvh place-items-center p-6 text-center"><div className="panel max-w-md p-8"><p className="chip mx-auto">404</p><h1 className="glow-title font-display mt-5 text-3xl font-extrabold">Page not found</h1><p className="mt-3 text-sm text-white/65">That Proteus page does not exist or may have moved.</p><Link to="/" className="btn-glow btn-sm mt-6">Back home</Link></div></div>,
  errorComponent: ({ error }) => <div className="stage grid min-h-dvh place-items-center p-6 text-center"><div className="panel max-w-md p-8"><p className="chip mx-auto">Something went wrong</p><h1 className="glow-title font-display mt-5 text-3xl font-extrabold">Please try again</h1><p className="mt-3 text-sm text-white/65">{error instanceof Error ? error.message : 'Proteus could not load this view.'}</p><Link to="/" className="btn-glow btn-sm mt-6">Return home</Link></div></div>,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteName },
      { name: 'description', content: siteDescription },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:title', content: siteName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'theme-color', content: '#0a0f1d' },
    ],
    links: [
      ...(canonicalUrl ? [{ rel: 'canonical', href: canonicalUrl }] : []),
      { rel: 'icon', type: 'image/png', href: '/proteus-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800;900&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <SessionBootstrap>{children}</SessionBootstrap>
        <Scripts />
      </body>
    </html>
  )
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    let active = true
    loadCurrentSession()
      .then((user) => active && actions.setSession(user))
      .catch(() => active && actions.setSession(null))
    return () => { active = false }
  }, [])
  return <>{children}</>
}
