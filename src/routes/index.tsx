import { createFileRoute } from '@tanstack/react-router'
import { Rocket, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { AccessibilityWidget } from '@/components/AccessibilityWidget'
import { AuthModal } from '@/components/AuthModal'
import { LegalFooter } from '@/components/LegalFooter'
import { PathwayIcon } from '@/components/PathwayIcon'
import { SiteNav } from '@/components/SiteNav'
import { SupportChatbot } from '@/components/SupportChatbot'
import { PATHWAYS } from '@/lib/fixtures'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  const [open, setOpen] = useState(false)

  return (
    <div className="stage hero relative flex min-h-dvh flex-col items-center overflow-x-hidden px-5 text-center">
      <div className="grid-overlay" aria-hidden />
      <SiteNav />

      <main id="main-content" tabIndex={-1} className="relative z-10 flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-start gap-1 pb-1 pt-3 sm:gap-2 sm:pt-4">
        <span className="chip rise"><Sparkles className="h-3.5 w-3.5" /> Adaptive, protein-first weight loss</span>
        <h1 className="hero-title glow-title font-display rise" style={{ animationDelay: '60ms' }}>Your body<br />changes. Your plan<br />should too.</h1>
        <p className="hero-sub rise max-w-3xl text-base font-medium leading-relaxed text-white sm:text-lg" style={{ animationDelay: '120ms' }}>
          A rules-based protein-first planning tool for GLP-1 users, bariatric recovery, and sustainable fat loss — with a fresh 30-day plan built from the progress you enter.
        </p>
        <ul className="hero-cards rise flex w-full flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3" style={{ animationDelay: '180ms' }} aria-label="Pathways">
          {PATHWAYS.map((pathway) => <li key={pathway.id} className="pathway-card" title={pathway.tagline}><PathwayIcon id={pathway.id} className="h-3.5 w-3.5 shrink-0 text-[#bfe0ff]" /><span className="truncate font-display text-[0.8rem] font-bold text-white">{pathway.name}</span></li>)}
        </ul>
        <div className="hero-cta rise flex flex-col items-center" style={{ animationDelay: '240ms' }}>
          <p className="glow-text whitespace-nowrap text-xs font-semibold tracking-tight sm:text-sm">7 days free • $19.90/month after • cancel anytime</p>
          <div className="mt-3 flex items-center justify-center gap-1.5 sm:gap-4">
            <AccessibilityWidget inline />
            <button onClick={() => setOpen(true)} className="btn-glow"><Rocket /> Build your plan</button>
            <SupportChatbot inline />
          </div>
        </div>
        <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-white/45">Proteus is a general wellness tool, not medical care or an AI clinician. Review medication, surgery, nutrition, and exercise changes with your healthcare professional.</p>
      </main>

      <LegalFooter />
      <AuthModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
