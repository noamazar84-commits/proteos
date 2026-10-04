import { createFileRoute } from '@tanstack/react-router'
import { Camera, FileImage, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { NeedsPathway, PageHeader } from '@/components/PageHeader'
import { getPathway } from '@/lib/fixtures'
import { actions, useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/meal-scanner')({ component: MealScanner })

type Estimate = { calories: number; protein: number; carbs: number; sugars: number; summary: string }

function MealScanner() {
  const state = useAppState()
  const [preview, setPreview] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [logged, setLogged] = useState(false)
  const pathway = state.profile ? getPathway(state.profile.pathwayId) : null
  if (!pathway) return <NeedsPathway />

  const analyze = (file: File) => {
    setPreview(URL.createObjectURL(file))
    const base: Estimate = pathway.id === 'bariatric'
      ? { calories: 360, protein: 32, carbs: 28, sugars: 7, summary: 'A portion-aware estimate with protein prioritised for your bariatric pathway.' }
      : pathway.id === 'glp1'
        ? { calories: 420, protein: 38, carbs: 34, sugars: 9, summary: 'A protein-dense estimate designed for smaller, appetite-friendly meals.' }
        : { calories: 560, protein: 42, carbs: 52, sugars: 12, summary: 'A balanced estimate compared with your current weight-loss targets.' }
    setEstimate(base)
    setLogged(false)
  }

  return <div>
    <PageHeader eyebrow="AI pathway helper" title="Meal scanner">Upload a meal photo for an instant educational estimate of calories, protein, carbohydrates, and sugars, interpreted for your {pathway.name} pathway.</PageHeader>

    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="panel p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-volt/50 bg-volt/10 text-volt-2"><Camera className="h-5 w-5" /></span><div><h2 className="font-display text-xl font-bold text-white">Scan a meal</h2><p className="mt-1 text-sm text-white">Use a clear photo of the full plate, bowl, or packaged meal.</p></div></div>
        <label className="mt-6 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-volt/60 bg-volt/[0.06] p-6 text-center transition hover:bg-volt/10">
          {preview ? <img src={preview} alt="Uploaded meal preview" className="max-h-56 rounded-xl object-cover shadow-[0_0_28px_rgba(61,139,255,0.35)]" /> : <><FileImage className="h-12 w-12 text-volt-2" /><span className="mt-4 font-semibold text-white">Choose a meal photo</span><span className="mt-1 text-sm text-white">JPG, PNG, or HEIC · one meal at a time</span></>}
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) analyze(file) }} />
        </label>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-volt/30 bg-volt/10 p-4 text-sm text-white"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-volt-2" /><span>Estimates are educational, not a medical or diagnostic measurement. Check labels and ask a professional when accuracy matters.</span></div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-volt-2" /><h2 className="font-display text-xl font-bold text-white">Nutrition breakdown</h2></div>
        {!estimate ? <div className="grid min-h-64 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"><div><Sparkles className="mx-auto h-9 w-9 text-volt-2" /><p className="mt-4 font-semibold text-white">Your scan results will appear here</p><p className="mt-1 text-sm text-white">Upload a photo to start the pathway-aware estimate.</p></div></div> : <div className="mt-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Calories', `${estimate.calories} kcal`], ['Protein', `${estimate.protein} g`], ['Carbs', `${estimate.carbs} g`], ['Sugars', `${estimate.sugars} g`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-volt/30 bg-volt/[0.08] p-4 text-center"><p className="glow-text font-display text-xl font-bold">{value}</p><p className="mt-1 text-xs uppercase tracking-wider text-white">{label}</p></div>)}</div><p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white">{estimate.summary}</p><button type="button" onClick={() => { actions.addMealScan(estimate); setLogged(true) }} className="btn-glow btn-sm mt-5" disabled={logged}><Sparkles className="h-4 w-4" /> {logged ? 'Added to today’s log' : "Use this estimate in today's log"}</button></div>}
      </section>
    </div>
  </div>
}
