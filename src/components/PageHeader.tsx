import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <span className="chip">{eyebrow}</span>
      <h1 className="glow-title font-display mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
      {children && <p className="mt-4 text-base text-white sm:text-lg">{children}</p>}
    </div>
  )
}

export function NeedsPathway() {
  return (
    <div className="panel mx-auto max-w-lg p-10 text-center">
      <h2 className="font-display text-2xl font-bold text-white">Choose a pathway first</h2>
      <p className="mt-3 text-white">Your plan, protein target and check-ins are all built from the pathway you pick.</p>
      <Link to="/app" className="btn-glow btn-sm mt-7">
        Pick my pathway
      </Link>
    </div>
  )
}
