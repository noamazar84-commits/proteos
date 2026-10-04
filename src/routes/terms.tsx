import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { LegalFooter } from '@/components/LegalFooter'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms of Use — Proteus' }, { name: 'description', content: 'Terms governing use of the Proteus coaching service.' }] }),
  component: TermsOfUse,
})

function TermsOfUse() {
  return <LegalShell title="Terms of Use" updated="September 29, 2026">
    <p>By creating an account or using Proteus, you agree to these Terms of Use and the <Link className="text-volt-2 hover:text-white" to="/privacy">Privacy Policy</Link>. The refund terms below are part of these Terms of Use.</p>
    <h2>Service and eligibility</h2>
    <p>Proteus provides general wellness, nutrition, and exercise planning tools for adults who can legally enter this agreement. You must be at least 18 to create or use an account; Proteus is not directed to children. The rules-based planner is not medical care, diagnosis, treatment, or a substitute for advice from a qualified clinician. Consult your healthcare professional before changing medication, diet, or exercise, especially after surgery or while using prescription medication.</p>
    <h2>Accounts and acceptable use</h2>
    <p>You are responsible for the accuracy of information you submit, maintaining control of your account, and promptly reporting unauthorized use. Do not misuse the service, attempt to bypass access controls, interfere with the platform, upload malicious content, or use another person’s account.</p>
    <h2>Trial, billing, and cancellation</h2>
    <p>Whop collects a payment method at checkout for the 7-day free trial. Unless canceled before the trial ends, the applicable recurring price is charged after the trial. Cancellation prevents future billing cycles.</p>
    <h2>Refund policy</h2>
    <p>Proteus provides a 7-day free trial. Once the trial ends and the initial payment is successfully processed, all sales are strictly final and non-refundable. Even if you cancel shortly after payment, no refunds will be issued; you retain access for the remainder of the paid month.</p>
    <p>Cancel before the next renewal through Whop or by contacting the service operator. Nothing in this policy limits non-waivable consumer-protection rights. If a payment was unauthorized or duplicated, contact the service operator promptly so it can be investigated with Whop.</p>
    <h2>Intellectual property</h2>
    <p>Proteus, its software, branding, content, and design are owned by the service operator or its licensors. You receive a limited, non-transferable right to use the service for personal purposes while your account is in good standing.</p>
    <h2>Disclaimer and limitation of liability</h2>
    <p>To the maximum extent permitted by law, Proteus is provided “as is” and “as available,” without warranties that plans will achieve a particular health, weight, or financial outcome. To the maximum extent permitted by law, the service operator will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, or access arising from use of the service. Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>
    <h2>Changes and termination</h2>
    <p>We may update these Terms when the service or law changes. We may suspend or terminate accounts for abuse, unlawful use, security risk, or non-payment. The sections on payments, intellectual property, disclaimers, limitations, and disputes survive termination.</p>
  </LegalShell>
}

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="stage relative min-h-dvh"><div className="grid-overlay" aria-hidden /><header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-6"><Link to="/"><Logo size="sm" /></Link><Link to="/" className="flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link></header><main className="relative z-10 mx-auto max-w-3xl px-5 pb-10"><article className="panel p-6 text-left sm:p-10"><p className="chip">Proteus legal</p><h1 className="glow-title font-display mt-5 text-3xl font-extrabold sm:text-4xl">{title}</h1><p className="mt-2 text-xs text-white/45">Last updated {updated}</p><div className="legal-copy mt-8 space-y-5 text-sm leading-7 text-white/72">{children}</div></article></main><LegalFooter /></div>
}
