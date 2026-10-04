import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { LegalFooter } from '@/components/LegalFooter'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/refund')({
  head: () => ({ meta: [{ title: 'Refund Policy — Proteus' }, { name: 'description', content: 'Proteus subscription cancellation and no-refund policy.' }] }),
  component: RefundPolicy,
})

function RefundPolicy() {
  return <LegalShell title="Refund Policy" updated="September 29, 2026">
    <h2>Strict no-refund policy</h2>
    <p>Proteus provides a 7-day free trial. Once the 7-day free trial ends and the initial payment is successfully processed, <strong>all sales are strictly final and non-refundable</strong>.</p>
    <p>Even if you cancel shortly after payment, no refunds will be issued. You retain full access to Proteus for the remainder of the paid month, and cancellation only prevents future billing cycles.</p>
    <h2>How to cancel</h2>
    <p>Cancel before the next renewal through the billing controls made available by Whop or by contacting the service operator. A cancellation confirmation applies to future billing only and does not reverse a successfully processed payment.</p>
    <h2>Exceptions</h2>
    <p>Nothing in this policy limits non-waivable rights under applicable consumer-protection law. If a payment was unauthorized or duplicated, contact the service operator promptly so the transaction can be investigated with Whop.</p>
    <p>For related billing terms, review the <Link className="text-volt-2 hover:text-white" to="/terms">Terms of Use</Link> and <Link className="text-volt-2 hover:text-white" to="/privacy">Privacy Policy</Link>.</p>
  </LegalShell>
}

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="stage relative min-h-dvh"><div className="grid-overlay" aria-hidden /><header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-6"><Link to="/"><Logo size="sm" /></Link><Link to="/" className="flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link></header><main className="relative z-10 mx-auto max-w-3xl px-5 pb-10"><article className="panel p-6 text-left sm:p-10"><p className="chip">Proteus legal</p><h1 className="glow-title font-display mt-5 text-3xl font-extrabold sm:text-4xl">{title}</h1><p className="mt-2 text-xs text-white/45">Last updated {updated}</p><div className="legal-copy mt-8 space-y-5 text-sm leading-7 text-white/72">{children}</div></article></main><LegalFooter /></div>
}
