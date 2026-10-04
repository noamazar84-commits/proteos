import { Link } from '@tanstack/react-router'
import { Bot, Send, X } from 'lucide-react'
import { useState } from 'react'

const QUICK = [
  ['How much does Proteus cost?', 'Proteus is $19.90/month after the 7-day free trial. Whop collects a payment method at checkout.'],
  ['How does the trial work?', 'You get 7 days free. If you do not cancel before the trial ends, Whop processes the first monthly payment.'],
  ['Can I get a refund?', 'After the trial ends and payment succeeds, all sales are final and non-refundable. Cancellation keeps access through the paid month and prevents future billing.'],
  ['What does Proteus include?', 'Choose a pathway, get a custom 30-day plan, track progress, and receive an adaptive plan each month.'],
] as const

function answer(question: string): string {
  const normalized = question.toLowerCase()
  if (normalized.includes('refund') || normalized.includes('cancel')) return QUICK[2][1]
  if (normalized.includes('trial') || normalized.includes('charge') || normalized.includes('price') || normalized.includes('cost')) return normalized.includes('price') || normalized.includes('cost') ? QUICK[0][1] : QUICK[1][1]
  if (normalized.includes('what') || normalized.includes('include') || normalized.includes('work')) return QUICK[3][1]
  return 'I can help with pricing, the 7-day trial, cancellations, refunds, and how Proteus works. For anything else, send us a message through Connect Us.'
}

export function SupportChatbot({ inline = false, pathwayName }: { inline?: boolean; pathwayName?: string }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState(`Hi — I’m here to support your ${pathwayName ?? 'Proteus'} journey. I can help with wellbeing check-ins, food, movement, billing, and access.`)
  const ask = (value = question) => { if (!value.trim()) return; setReply(answer(value)); setQuestion('') }
  return <div className={inline ? 'relative z-40 text-left' : 'fixed bottom-5 right-5 z-40 text-left'}>
    {open && <div className="panel mb-3 w-[min(21rem,calc(100vw-2.5rem))] p-4 shadow-[0_0_30px_rgba(61,139,255,0.22)]" role="dialog" aria-label="Proteus support chat">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-volt/20 text-volt-2"><Bot className="h-4 w-4" /></span><h2 className="font-display text-sm font-bold text-white">Proteus support</h2></div><button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/50 hover:text-white" aria-label="Close support chat"><X className="h-4 w-4" /></button></div>
      <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm leading-relaxed text-white/75">{reply}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{QUICK.map(([label]) => <button key={label} onClick={() => ask(label)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/65 hover:border-volt/50 hover:text-white">{label}</button>)}</div>
      <form onSubmit={(event) => { event.preventDefault(); ask() }} className="mt-3 flex gap-2"><input className="field min-w-0 py-2 text-sm" aria-label="Ask support" placeholder="Ask a question…" value={question} onChange={(event) => setQuestion(event.target.value)} /><button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt text-white" aria-label="Send question"><Send className="h-4 w-4" /></button></form>
      <Link to="/support" hash="connect" onClick={() => setOpen(false)} className="mt-3 inline-block text-xs font-semibold text-volt-2 hover:text-white">Need more help? Connect Us →</Link>
    </div>}
    <button onClick={() => setOpen((value) => !value)} className="grid h-12 w-12 place-items-center rounded-full border border-volt/60 bg-[#0A0F1D]/90 text-volt-2 shadow-[0_0_22px_rgba(61,139,255,0.45)] backdrop-blur-md hover:text-white" aria-label="Open Proteus support chat" aria-expanded={open}><Bot className="h-6 w-6" /></button>
  </div>
}
