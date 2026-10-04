import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Camera, Check, Clock, Flame, Target, Wand2, Zap } from 'lucide-react'
import { NeedsPathway } from '@/components/PageHeader'
import { MEALS, getPathway, type Appetite, type Meal, type MealSlot } from '@/lib/fixtures'
import { actions, currentWeight, useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/protein')({ component: ProteinScreen })

interface SlotDef { key: string; label: string; slot: MealSlot; weight: number }
const SLOT_LAYOUTS: Record<3 | 4 | 5, SlotDef[]> = {
  3: [{ key: 'breakfast', label: 'Breakfast', slot: 'breakfast', weight: 1 }, { key: 'lunch', label: 'Lunch', slot: 'lunch', weight: 1 }, { key: 'dinner', label: 'Dinner', slot: 'dinner', weight: 1 }],
  4: [{ key: 'breakfast', label: 'Breakfast', slot: 'breakfast', weight: 1 }, { key: 'lunch', label: 'Lunch', slot: 'lunch', weight: 1 }, { key: 'snack-1', label: 'Snack', slot: 'snack', weight: .6 }, { key: 'dinner', label: 'Dinner', slot: 'dinner', weight: 1 }],
  5: [{ key: 'breakfast', label: 'Breakfast', slot: 'breakfast', weight: 1 }, { key: 'snack-1', label: 'Morning snack', slot: 'snack', weight: .6 }, { key: 'lunch', label: 'Lunch', slot: 'lunch', weight: 1 }, { key: 'snack-2', label: 'Afternoon snack', slot: 'snack', weight: .6 }, { key: 'dinner', label: 'Dinner', slot: 'dinner', weight: 1 }],
}
const APPETITE_COPY: Record<Appetite, string> = { light: 'Smaller, lean portions', moderate: 'Balanced, satisfying plates', big: 'Hearty, calorie-dense meals' }
const ORDER: Appetite[] = ['light', 'moderate', 'big']
const BUILD_STATUS = ['Reading daily targets…', 'Balancing macro distribution…', 'Optimizing protein anchors…', 'Composing your day…']
const appetiteDistance = (a: Appetite, b: Appetite) => Math.abs(ORDER.indexOf(a) - ORDER.indexOf(b))

function ProteinScreen() {
  const state = useAppState()
  const [building, setBuilding] = useState(false)
  const [buildStep, setBuildStep] = useState(0)
  const [revealedSlots, setRevealedSlots] = useState<string[]>([])
  const [buildRun, setBuildRun] = useState(0)

  if (!state.profile) return <NeedsPathway />

  const { perKg, appetite, mealsPerDay, selections } = state.protein
  const pathway = getPathway(state.profile.pathwayId)
  const weight = currentWeight(state)
  const refWeight = Math.min(weight, Math.round(state.profile.goalWeightKg * 1.15))
  const target = Math.max(pathway.proteinFloor, Math.round((refWeight * perKg) / 5) * 5)
  const slots = SLOT_LAYOUTS[mealsPerDay]
  const totalWeight = slots.reduce((sum, slot) => sum + slot.weight, 0)
  const slotTarget = (slot: SlotDef) => Math.round((target * slot.weight) / totalWeight)
  const chosen = slots.map((slot) => MEALS.find((meal) => meal.id === selections[slot.key])).filter(Boolean) as Meal[]
  const total = chosen.reduce((sum, meal) => ({ protein: sum.protein + meal.protein, kcal: sum.kcal + meal.kcal }), { protein: 0, kcal: 0 })
  const pct = Math.min(100, Math.round((total.protein / target) * 100))
  const calorieTarget = state.months[state.months.length - 1]?.calories ?? 0
  const optionsFor = (slot: SlotDef) => MEALS.filter((meal) => meal.slot === slot.slot && appetiteDistance(meal.appetite, appetite) <= 1).sort((a, b) => appetiteDistance(a.appetite, appetite) - appetiteDistance(b.appetite, appetite) || Math.abs(a.protein - slotTarget(slot)) - Math.abs(b.protein - slotTarget(slot)))

  const autoBuild = () => {
    if (building) return
    const next: Record<string, string> = {}
    const used = new Set<string>()
    for (const slot of slots) {
      const best = optionsFor(slot).filter((meal) => !used.has(meal.id)).sort((a, b) => Math.abs(a.protein - slotTarget(slot)) - Math.abs(b.protein - slotTarget(slot)))[0]
      if (best) { next[slot.key] = best.id; used.add(best.id) }
    }
    setBuilding(true)
    setBuildRun((value) => value + 1)
    setBuildStep(0)
    setRevealedSlots([])
  }

  useEffect(() => {
    if (!building) return
    const timers = [800, 1600, 2400].map((delay, index) => window.setTimeout(() => setBuildStep(index + 1), delay))
    const finish = window.setTimeout(() => {
      const next: Record<string, string> = {}
      const used = new Set<string>()
      for (const slot of slots) {
        const best = optionsFor(slot).filter((meal) => !used.has(meal.id)).sort((a, b) => Math.abs(a.protein - slotTarget(slot)) - Math.abs(b.protein - slotTarget(slot)))[0]
        if (best) { next[slot.key] = best.id; used.add(best.id) }
      }
      actions.setProtein({ selections: next })
      slots.forEach((slot, index) => window.setTimeout(() => {
        setRevealedSlots((current) => [...current, slot.key])
        if (index === slots.length - 1) setBuilding(false)
      }, index * 150))
    }, 3200)
    return () => { timers.forEach((timer) => window.clearTimeout(timer)); window.clearTimeout(finish) }
  }, [buildRun])

  return (
    <div data-view-state="meal-builder-rewritten" aria-busy={building} className="meal-builder-viewport relative">
      {building && <MealBuildOverlay step={buildStep} />}

      <section className="meal-target-hero panel">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border border-volt/50 bg-volt/[0.08]">
            <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" /><circle cx="60" cy="60" r="52" fill="none" stroke="#3d8bff" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={(2 * Math.PI * 52) * (1 - pct / 100)} style={{ filter: 'drop-shadow(0 0 7px rgba(61,139,255,.8))', transition: 'stroke-dashoffset .45s ease' }} /></svg>
            <span className="relative font-display text-lg font-extrabold text-white">{total.protein}<small className="text-[9px] text-white">g</small></span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-volt-2">{pathway.name} · Daily target</p><span className="chip px-2 py-1 text-xs">{pct}% planned</span></div>
            <div className="flex flex-wrap items-baseline gap-x-2"><h1 className="font-display text-2xl font-bold text-white">{target} g protein</h1><span className="text-sm font-semibold text-gray-200">{perKg.toFixed(1)} g/kg · {refWeight} kg ref.</span></div>
            <input aria-label="Protein grams per kilogram" type="range" className="range mt-1.5" min={1.2} max={2.4} step={.1} value={perKg} onChange={(event) => actions.setProtein({ perKg: +event.target.value })} />
          </div>
        </div>
        <div className="meal-target-controls grid grid-cols-2 gap-2 sm:min-w-[15rem]">
          <ControlGroup label="Meals" icon={<Target className="h-4 w-4" />}><div className="grid grid-cols-3 gap-1">{([3, 4, 5] as const).map((number) => <button key={number} type="button" className="seg min-h-10 px-3 py-2 text-sm font-bold" data-active={mealsPerDay === number} onClick={() => actions.setProtein({ mealsPerDay: number })}>{number}</button>)}</div></ControlGroup>
          <ControlGroup label="Appetite" icon={<Zap className="h-4 w-4" />}><div className="grid grid-cols-3 gap-1">{ORDER.map((value) => <button key={value} type="button" className="seg min-h-10 px-2 py-2 text-sm font-bold capitalize" data-active={appetite === value} onClick={() => actions.setProtein({ appetite: value })}>{value}</button>)}</div></ControlGroup>
        </div>
        <div className="meal-target-footer text-sm font-semibold"><span>{APPETITE_COPY[appetite]} · about {Math.round(target / mealsPerDay)} g per meal</span><span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-volt-2" /> {total.kcal.toLocaleString()} / {calorieTarget.toLocaleString()} kcal planned</span></div>
      </section>

      <section className="meal-builder-shell mt-3">
        <header className="meal-options-header"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-volt-2">Build your day</p><h2 className="font-display text-2xl font-bold text-white">Meal Options</h2></div><div className="flex flex-wrap gap-2"><button type="button" className="seg min-h-11 px-4 py-2 text-sm font-bold" onClick={() => window.dispatchEvent(new Event('proteus:open-meal-scanner'))}><Camera className="h-4 w-4" /> Scan</button><button type="button" className="seg min-h-11 px-4 py-2 text-sm font-bold" onClick={() => actions.setProtein({ selections: {} })}>Clear</button><button type="button" className="btn-glow btn-sm min-h-11 px-4 text-sm font-bold" disabled={building} onClick={autoBuild}><Wand2 className={`h-4 w-4 ${building ? 'animate-spin' : ''}`} /> {building ? 'Building…' : 'Auto-build my day'}</button></div></header>
        <div className="meal-options-grid">
          {slots.map((slot) => {
            const selectedId = selections[slot.key]
            return <article key={slot.key} className={`meal-slot-card panel ${building && !revealedSlots.includes(slot.key) ? 'meal-slot-dim' : ''}`}><div className="mb-2 flex items-baseline justify-between gap-2"><h3 className="font-display text-xl font-bold text-white">{slot.label}</h3><span className="text-sm font-semibold text-gray-200">aim {slotTarget(slot)} g</span></div><div className="meal-choice-grid">{optionsFor(slot).map((meal) => { const active = selectedId === meal.id; const taken = !active && Object.entries(selections).some(([key, value]) => key !== slot.key && value === meal.id); return <button key={meal.id} type="button" disabled={taken || building} onClick={() => actions.setProtein({ selections: { ...selections, [slot.key]: active ? '' : meal.id } })} className={`meal-choice relative rounded-xl border p-3 text-left transition duration-300 hover:-translate-y-0.5 disabled:opacity-35 ${active ? 'border-volt bg-volt/15 shadow-[0_0_18px_rgba(61,139,255,.3)]' : 'border-white/10 bg-white/[0.02] hover:border-volt/40'}`}>{active && <Check className="absolute right-2 top-2 h-4 w-4 text-volt-2" />}<p className="pr-5 text-base font-bold leading-snug text-white">{meal.name}</p><p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-gray-200"><span className="font-bold text-volt-2">{meal.protein}g P</span><span>{meal.kcal} kcal</span><span className="flex items-center gap-1"><Clock className="h-4 w-4 text-volt-2" />{meal.prepMin}m</span></p><p className="mt-1 truncate text-sm font-medium text-gray-200">C {meal.carbs} · F {meal.fat} · {meal.tags.join(' · ')}</p></button> })}</div></article>
          })}
        </div>
      </section>
    </div>
  )
}

function ControlGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div><p className="mb-1 flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-white">{icon}{label}</p>{children}</div>
}

function MealBuildOverlay({ step }: { step: number }) {
  return <div data-overlay="meal-build-centered" className="meal-build-overlay fixed inset-0 z-[80] grid place-items-center bg-[#020611]/90 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="build-day-title"><section className="screen-enter w-full max-w-md rounded-[2rem] border border-volt/60 bg-[#0b1733] p-8 text-center shadow-[0_0_110px_rgba(61,139,255,.58)]"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-volt/60 bg-volt/15 text-volt-2 shadow-[0_0_34px_rgba(61,139,255,.62)]"><Wand2 className="h-8 w-8 animate-pulse" /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-volt-2">Proteus intelligence · deep thinking</p><h2 id="build-day-title" className="glow-title mt-2 font-display text-3xl font-extrabold text-white">Building your day</h2><p className="mt-3 min-h-6 text-sm text-white" aria-live="polite">{BUILD_STATUS[step]}</p><div className="mx-auto mt-6 flex max-w-xs gap-2">{BUILD_STATUS.map((status, index) => <span key={status} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${index <= step ? 'bg-volt-2 shadow-[0_0_12px_#6fb6ff]' : 'bg-white/10'}`} />)}</div><p className="mt-5 text-[11px] text-white">Balancing your targets, appetite, and pathway rhythm.</p></section></div>
}
