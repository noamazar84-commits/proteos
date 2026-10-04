import { Accessibility, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function AccessibilityWidget({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.largeText = largeText ? 'true' : 'false'
    document.documentElement.dataset.highContrast = highContrast ? 'true' : 'false'
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
    return () => {
      delete document.documentElement.dataset.largeText
      delete document.documentElement.dataset.highContrast
      delete document.documentElement.dataset.reducedMotion
    }
  }, [largeText, highContrast, reducedMotion])

  const reset = () => { setLargeText(false); setHighContrast(false); setReducedMotion(false) }
  return <div className={inline ? 'relative z-40 text-left' : 'fixed bottom-5 left-5 z-40 text-left'}>
    {open && <div className="panel mb-3 w-64 p-4 shadow-[0_0_30px_rgba(61,139,255,0.22)]" role="dialog" aria-label="Accessibility options">
      <div className="flex items-center justify-between"><h2 className="font-display text-sm font-bold text-white">Accessibility options</h2><button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/50 hover:text-white" aria-label="Close accessibility options"><X className="h-4 w-4" /></button></div>
      <div className="mt-3 space-y-2 text-sm text-white/75">
        <button onClick={() => setLargeText((value) => !value)} className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left hover:bg-white/10" aria-pressed={largeText}>Larger text {largeText ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</button>
        <button onClick={() => setHighContrast((value) => !value)} className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left hover:bg-white/10" aria-pressed={highContrast}>Higher contrast <span className="text-xs">{highContrast ? 'On' : 'Off'}</span></button>
        <button onClick={() => setReducedMotion((value) => !value)} className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left hover:bg-white/10" aria-pressed={reducedMotion}>Reduce motion <span className="text-xs">{reducedMotion ? 'On' : 'Off'}</span></button>
      </div>
      <button onClick={reset} className="mt-3 flex items-center gap-1 text-xs font-semibold text-volt-2 hover:text-white"><RotateCcw className="h-3 w-3" /> Reset</button>
    </div>}
    <button onClick={() => setOpen((value) => !value)} className="grid h-12 w-12 place-items-center rounded-full border border-volt/60 bg-[#0A0F1D]/90 text-volt-2 shadow-[0_0_22px_rgba(61,139,255,0.45)] backdrop-blur-md hover:text-white" aria-label="Open accessibility options" aria-expanded={open}><Accessibility className="h-6 w-6" /></button>
  </div>
}
