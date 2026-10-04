import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { LegalFooter } from '@/components/LegalFooter'
import { Logo } from '@/components/Logo'

const FAQS = [
  ['How much does Proteus cost?', 'Proteus is $19.90 per month after the 7-day free trial. Whop collects a payment method at checkout so your membership can continue without interruption if you choose to keep it.'],
  ['How does the 7-day free trial work?', 'Your 7-day trial begins when Whop confirms your membership. You can cancel before the trial ends to prevent the first charge. If you do not cancel, Whop processes the initial monthly payment after the trial.'],
  ['Can I get a refund after I am charged?', 'No. Once the 7-day free trial ends and the initial payment is successfully processed, all sales are strictly final and non-refundable. Canceling shortly after payment does not create a refund; you keep access for the remainder of the paid month and cancellation prevents only future billing cycles.'],
  ['What does the platform include?', 'Choose a pathway, receive a custom 30-day plan, track your progress, and get a new plan each month rebuilt from your real check-ins and preferences.'],
  ['Is Proteus medical advice?', 'No. Proteus provides general wellness and nutrition planning, not diagnosis or treatment. Speak with a qualified healthcare professional before changing medication, diet, or exercise.'],
] as const

export const Route = createFileRoute('/support')({
  head: () => ({ meta: [{ title: 'Support — Proteus' }, { name: 'description', content: 'Proteus frequently asked questions and contact support.' }] }),
  component: Support,
})

function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [contact, setContact] = useState({ name: '', email: '', message: '' })
  const [contactState, setContactState] = useState<{ type: 'idle' | 'sending' | 'success' | 'error'; text?: string }>({ type: 'idle' })

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setContactState({ type: 'sending' })
    try {
      const response = await fetch('/api/contact', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(contact) })
      const body = await response.json().catch(() => ({})) as { message?: string; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Your message could not be sent.')
      setContact({ name: '', email: '', message: '' })
      setContactState({ type: 'success', text: body.message ?? 'Thanks — your message has been sent.' })
    } catch (cause) {
      setContactState({ type: 'error', text: cause instanceof Error ? cause.message : 'Your message could not be sent. Please try again.' })
    }
  }

  return <div className="stage relative min-h-dvh"><div className="grid-overlay" aria-hidden /><header className="sticky top-0 z-30 mx-auto flex max-w-5xl items-center justify-between border-b border-white/5 bg-[#0A0F1D]/75 px-5 py-6 backdrop-blur-xl"><Link to="/"><Logo size="sm" /></Link><Link to="/" className="flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link></header><main id="main-content" tabIndex={-1} className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-12"><div className="text-center"><span className="chip">Support</span><h1 className="glow-title font-display mt-4 text-4xl font-extrabold">Frequently asked questions</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/65">Find quick answers or send a message directly to the Proteus inbox.</p></div><section id="faq" aria-labelledby="faq-heading" className="scroll-mt-6 pt-10"><h2 id="faq-heading" className="sr-only">Frequently asked questions</h2><div className="mx-auto max-w-4xl space-y-3">{FAQS.map(([question, answer], index) => <div key={question} className="panel overflow-hidden"><button className="faq-trigger flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-white" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown className={`h-5 w-5 shrink-0 text-volt-2 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} /></button><div className={`faq-answer ${openFaq === index ? 'faq-answer-open' : ''}`}><div className="px-5 pb-5 text-sm leading-relaxed text-white/70">{answer}</div></div></div>)}</div></section><section id="connect" aria-labelledby="connect-heading" className="mx-auto max-w-5xl scroll-mt-6 pt-16"><div className="panel grid gap-8 p-6 text-left sm:p-9 md:grid-cols-[0.8fr_1.2fr]"><div><span className="chip">Connect Us</span><h2 id="connect-heading" className="glow-title font-display mt-4 text-3xl font-extrabold">Questions? We’re here.</h2><p className="mt-3 text-sm leading-relaxed text-white/65">Send a message and our team will receive it directly in the Proteus inbox.</p></div><form onSubmit={submitContact} className="space-y-3"><label className="block"><span className="sr-only">Name</span><input className="field" name="name" autoComplete="name" placeholder="Your name" maxLength={100} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} required /></label><label className="block"><span className="sr-only">Email address</span><input className="field" name="email" type="email" autoComplete="email" placeholder="Email address" maxLength={320} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} required /></label><label className="block"><span className="sr-only">Message</span><textarea className="field min-h-28" name="message" placeholder="How can we help?" maxLength={4000} value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} required /></label>{contactState.text && <p role="status" className={contactState.type === 'error' ? 'text-sm text-rose-300' : 'text-sm text-volt-2'}>{contactState.text}</p>}<button className="btn-glow btn-sm" type="submit" disabled={contactState.type === 'sending'}><Mail className="h-4 w-4" />{contactState.type === 'sending' ? 'Sending…' : 'Send message'}</button></form></div></section></main><LegalFooter /></div>
}
