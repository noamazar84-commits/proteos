import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { LegalFooter } from '@/components/LegalFooter'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy Policy — Proteus' }, { name: 'description', content: 'How Proteus collects, uses, and protects personal information.' }] }),
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return <LegalShell title="Privacy Policy" updated="September 29, 2026">
    <p>Proteus provides adaptive, protein-first coaching. This Privacy Policy explains what we collect, why we collect it, and the choices available to you.</p>
    <p className="rounded-xl border border-volt/35 bg-volt/10 p-4 font-semibold text-white">Proteus is an AI-powered tracking and educational tool and does NOT replace professional medical or nutritional advice. Always consult with qualified healthcare professionals for medical or dietary decisions.</p>
    <h2>Information we collect</h2>
    <ul><li><strong>Account information:</strong> email address, account username or display name, authentication provider identifier, and profile details you provide.</li><li><strong>Health and coaching inputs:</strong> pathway selection, weight, goal weight, activity, check-ins, nutrition preferences, and notes you choose to save.</li><li><strong>Technical information:</strong> IP address, browser/device information, request timestamps, approximate location derived from IP where necessary for security, and diagnostic events. IP addresses may be used for abuse prevention and rate limiting.</li><li><strong>Billing information:</strong> Whop processes payment method, credit-card, billing, subscription, and payment details. Proteus does not store full card numbers or security codes. We receive limited billing status, membership identifiers, payment dates, renewal dates, and amounts needed to provide the service.</li></ul>
    <h2>How we use information</h2>
    <p>We use information to authenticate accounts, provide plans, process subscriptions through Whop, prevent fraud and abuse, maintain security, respond to support requests, and improve reliability. We do not sell personal information. Proteus uses a rules-based planning engine; it does not make clinical decisions or claim to be a generative AI clinician.</p>
    <h2>Communications and tracking</h2>
    <p>Proteus does not send SMS/text messages, push notifications, or marketing campaigns. We do not use advertising pixels, behavioral analytics, or third-party tracking scripts. Health inputs, weights, goals, check-ins, and meal selections are not sent to analytics or advertising endpoints.</p>
    <h2>Biometric data</h2>
    <p>Proteus does not use facial recognition, face scans, voiceprints, or other biometric collection. No biometric consent or retention process is required because no biometric feature is offered.</p>
    <h2>Children and age eligibility</h2>
    <p>Proteus is an adults-only wellness service and is not directed to children under 18. New accounts must confirm that the user is at least 18, and the server records the confirmation time. We do not knowingly collect or use children’s personal information; if you believe a child created an account, contact support so it can be investigated and deleted.</p>
    <h2>Service providers and retention</h2>
    <p>We use infrastructure and service providers such as Google for authentication and Whop for checkout and billing. We retain account and subscription records while your account is active and as reasonably necessary for security, legal, accounting, and dispute-resolution purposes. You can delete your account from <Link className="text-volt-2 hover:text-white" to="/app/settings">Account Settings</Link>; active billing must be canceled with Whop first so deletion does not leave an unpaid provider subscription behind.</p>
    <h2>International privacy rights</h2>
    <p><strong>GDPR:</strong> where applicable, you may request access, correction, deletion, portability, restriction, or objection to processing, and may withdraw consent. Our processing purposes include contract performance, legitimate interests in security, and consent where requested. You may contact us about a concern or complain to your local supervisory authority.</p>
    <p><strong>CCPA/CPRA:</strong> California residents may request to know, access, correct, or delete personal information and may opt out of sale or sharing. Proteus does not sell personal information. We will not discriminate against you for exercising these rights.</p>
    <h2>Security and contact</h2>
    <p>We use server-side sessions, access controls, password hashing, signed webhook verification, and rate limiting. No online service is completely risk-free. For privacy requests, contact the service operator through the support channel provided with your Proteus account.</p>
  </LegalShell>
}

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="stage relative min-h-dvh"><div className="grid-overlay" aria-hidden /><header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-5 py-6"><Link to="/"><Logo size="sm" /></Link><Link to="/" className="flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link></header><main className="relative z-10 mx-auto max-w-3xl px-5 pb-10"><article className="panel p-6 text-left sm:p-10"><p className="chip">Proteus legal</p><h1 className="glow-title font-display mt-5 text-3xl font-extrabold sm:text-4xl">{title}</h1><p className="mt-2 text-xs text-white/45">Last updated {updated}</p><div className="legal-copy mt-8 space-y-5 text-sm leading-7 text-white/72">{children}</div></article></main><LegalFooter /></div>
}
