import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, RefreshCcw, Sparkles } from 'lucide-react'
import { NeedsPathway, PageHeader } from '@/components/PageHeader'
import { getPathway } from '@/lib/fixtures'
import { dayOfMonth, type CheckIn } from '@/lib/engine'
import { actions, currentWeight, useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/check-in')({ component: CheckInScreen })

function CheckInScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const plan = state.months[state.months.length - 1]
  const movementDays = plan?.days.filter((day) => day.type !== 'Rest') ?? []
  const movementAdherence = movementDays.length ? Math.round((movementDays.filter((day) => state.completed[`${plan?.monthIndex}:${day.day}`]).length / movementDays.length) * 100) : 80
  const [decision, setDecision] = useState<'choice' | 'keep' | 'update'>('choice')
  const [weight, setWeight] = useState(() => currentWeight(state))
  const [goalWeight, setGoalWeight] = useState(() => state.profile?.goalWeightKg ?? 80)
  const [waist, setWaist] = useState('')
  const [energy, setEnergy] = useState(3)
  const [adherence, setAdherence] = useState(movementAdherence)
  const [difficulty, setDifficulty] = useState<CheckIn['difficulty']>('right')
  const [hunger, setHunger] = useState<CheckIn['hunger']>('ok')
  const [medicationChanges, setMedicationChanges] = useState('')
  const [sideEffects, setSideEffects] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (movementDays.length) setAdherence(movementAdherence)
  }, [plan?.monthIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.profile || !plan) return <NeedsPathway />

  const pathway = getPathway(state.profile.pathwayId)
  const today = dayOfMonth(plan)
  const mandatory = today >= 30
  const change = +(weight - plan.startWeightKg).toFixed(1)
  const toGoal = +(weight - state.profile.goalWeightKg).toFixed(1)

  const keepCurrent = () => {
    actions.keepCurrentMonth()
    setDecision('keep')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    actions.submitCheckIn({ weightKg: weight, goalWeightKg: goalWeight, waistCm: waist ? +waist : undefined, energy, adherence, difficulty, hunger, medicationChanges: medicationChanges.trim(), sideEffects: sideEffects.trim(), notes: notes.trim() })
    navigate({ to: '/app/plan' })
  }

  return <div>
    <PageHeader eyebrow={`${pathway.name} · Month ${plan.monthIndex + 1} check-in`} title="Your smart monthly check-in">
      {mandatory ? `Your 30 days are complete. Update your current metrics so the Evolution Engine can build Month ${plan.monthIndex + 2}; the next phase cannot start without a review.` : `Day ${today} of 30. Check in early if something has changed; the next month can start from today.`}
    </PageHeader>

    <section className="panel mx-auto max-w-4xl p-6">
      <div className="rounded-xl border border-volt/35 bg-volt/10 p-4 text-sm text-white"><strong className="text-volt-2">30-Day Evolution Engine:</strong> your inputs are compared with the last phase and used to recalculate the next 30 days around your current status. Missing metrics are requested before the next phase can be generated.</div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-volt-2">Step 1 · Choose your next step</p>
      <div className={`mt-4 grid gap-4 ${mandatory ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {!mandatory && <button type="button" onClick={keepCurrent} className={`rounded-2xl border p-5 text-left transition ${decision === 'keep' ? 'border-volt bg-volt/15 shadow-[0_0_25px_rgba(61,139,255,0.3)]' : 'border-white/20 bg-white/[0.03] hover:border-volt/60'}`}>
          <CheckCircle2 className="h-7 w-7 text-volt-2" /><h2 className="font-display mt-4 text-xl font-bold text-white">Option A · Keep & Continue</h2><p className="mt-2 text-sm leading-relaxed text-white">If your weight and metrics are steady and the plan is working, continue this month’s nutrition and fitness targets seamlessly.</p>
        </button>}
        <button type="button" onClick={() => setDecision('update')} className={`rounded-2xl border p-5 text-left transition ${decision === 'update' ? 'border-volt bg-volt/15 shadow-[0_0_25px_rgba(61,139,255,0.3)]' : 'border-white/20 bg-white/[0.03] hover:border-volt/60'}`}>
          <RefreshCcw className="h-7 w-7 text-volt-2" /><h2 className="font-display mt-4 text-xl font-bold text-white">Option B · Update & Recalculate</h2><p className="mt-2 text-sm leading-relaxed text-white">Enter updated weight, activity, adherence, and appetite or medication changes so the planner can refresh next month.</p>
        </button>
      </div>
      {decision === 'choice' && <p className="mt-5 text-center text-sm text-white">{mandatory ? 'Update your metrics to generate the next adaptive phase.' : 'Select an option to continue.'}</p>}
      {decision === 'keep' && <div className="mt-6 flex flex-col items-center rounded-xl border border-volt/30 bg-volt/10 p-5 text-center"><p className="text-base font-semibold text-white">Month {plan.monthIndex + 1} stays active.</p><p className="mt-1 text-sm text-white">Your current targets remain unchanged until you are ready to update them.</p><Link to="/app/plan" className="btn-glow btn-sm mt-4">Continue to my plan</Link></div>}
    </section>

    {decision === 'update' && <form onSubmit={submit} className="panel mx-auto mt-6 max-w-3xl p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-volt-2">Step 2 · Updated inputs</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-3">
        <label className="block text-center"><span className="text-sm font-semibold text-white">Current weight (kg)</span><input type="number" step="0.1" min={30} max={300} required className="field mt-2 text-center text-2xl font-bold" value={weight} onChange={(e) => setWeight(+e.target.value)} /><span className={`mt-2 inline-flex items-center gap-1 text-sm ${change <= 0 ? 'text-volt-2' : 'text-amber-300'}`}>{change <= 0 ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}{Math.abs(change)} kg this month · {toGoal > 0 ? `${toGoal} kg to goal` : 'goal reached'}</span></label>
        <label className="block text-center"><span className="text-sm font-semibold text-white">Current goal (kg)</span><input type="number" step="0.1" min={30} max={300} required className="field mt-2 text-center text-2xl font-bold" value={goalWeight} onChange={(e) => setGoalWeight(+e.target.value)} /><span className="mt-2 block text-sm text-white">Can change with your goals</span></label>
        <label className="block text-center"><span className="text-sm font-semibold text-white">Waist (cm, optional)</span><input type="number" step="0.5" min={40} max={250} className="field mt-2 text-center text-2xl font-bold" placeholder="—" value={waist} onChange={(e) => setWaist(e.target.value)} /></label>
      </div>
      <Group label={`Plan adherence · ${adherence}%${movementDays.length ? ' · movement baseline available' : ''}`}><input type="range" className="range" min={0} max={100} step={5} value={adherence} onChange={(e) => setAdherence(+e.target.value)} /></Group>
      <Group label="Energy levels"><div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className="seg w-12" data-active={energy === n} onClick={() => setEnergy(n)}>{n}</button>)}</div></Group>
      <Group label="How did training feel?"><div className="flex justify-center gap-2">{([['easy', 'Too easy'], ['right', 'Just right'], ['hard', 'Too hard']] as const).map(([v, l]) => <button type="button" key={v} className="seg" data-active={difficulty === v} onClick={() => setDifficulty(v)}>{l}</button>)}</div></Group>
      <Group label={pathway.id === 'general' ? 'Hunger levels' : 'Appetite / medication or post-op changes'}><div className="flex justify-center gap-2">{([['low', 'Very low'], ['ok', 'Manageable'], ['high', 'High']] as const).map(([v, l]) => <button type="button" key={v} className="seg" data-active={hunger === v} onClick={() => setHunger(v)}>{l}</button>)}</div></Group>
      <Group label="Medication changes"><textarea className="field min-h-20" value={medicationChanges} onChange={(e) => setMedicationChanges(e.target.value)} placeholder="Dose, medication, or timing changes since the last review…" /></Group>
      <Group label="Side effects or recovery flags"><textarea className="field min-h-20" value={sideEffects} onChange={(e) => setSideEffects(e.target.value)} placeholder="Nausea, fatigue, pain, dizziness, or other symptoms to discuss with your clinician…" /></Group>
      <Group label="Anything else? (schedule changes, wins, context)"><textarea className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What should the next 30-day phase take into account?" /></Group>
      <p className="mt-6 text-center text-xs leading-relaxed text-white">Proteus is an AI-powered tracking and educational tool and does NOT replace professional medical or nutritional advice. Always consult qualified healthcare professionals for medical or dietary decisions.</p>
      <div className="mt-8 flex justify-center"><button type="submit" className="btn-glow"><Sparkles className="h-5 w-5" /> Generate Month {plan.monthIndex + 2}</button></div>
    </form>}

    {state.checkIns.length > 0 && <section className="panel mx-auto mt-8 max-w-3xl p-6"><h2 className="font-display text-center text-lg font-bold text-white">Your journey so far</h2><ul className="mt-4 space-y-2">{state.checkIns.map((c) => { const m = state.months[c.monthIndex]; const d = +(c.weightKg - m.startWeightKg).toFixed(1); return <li key={c.date} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-sm"><span className="font-semibold text-white">Month {c.monthIndex + 1}</span><span className="text-white">{m.startWeightKg} → {c.weightKg} kg</span><span className={d <= 0 ? 'font-semibold text-volt-2' : 'font-semibold text-amber-300'}>{d > 0 ? '+' : ''}{d} kg</span><span className="text-white">{c.adherence}% adherence</span></li> })}</ul><p className="mt-4 text-center text-sm"><Link to="/app/plan" className="font-semibold text-volt-2 hover:text-white">View all monthly plans →</Link></p></section>}
  </div>
}

function Group({ label, children }: { label: string; children: React.ReactNode }) { return <div className="mt-7 text-center"><p className="mb-3 text-sm font-semibold text-white">{label}</p>{children}</div> }
