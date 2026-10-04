import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  HeartPulse,
  RefreshCcw,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NeedsPathway } from '@/components/PageHeader'
import { MEALS, getPathway, type Appetite, type Meal, type MealSlot, type Pathway } from '@/lib/fixtures'
import { dayOfMonth, type MonthPlan, type PlanDay } from '@/lib/engine'
import { actions, isCheckpointDue, useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/plan')({ component: PlanScreen })

type HubView = 'overview' | 'nutrition' | 'fitness'
type MealCount = 3 | 4 | 5
type MealSlotDefinition = { key: string; label: string; slot: MealSlot }

const APPETITES: { value: Appetite; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'big', label: 'Big' },
]

const SLOT_LAYOUTS: Record<MealCount, MealSlotDefinition[]> = {
  3: [
    { key: 'breakfast', label: 'Breakfast', slot: 'breakfast' },
    { key: 'lunch', label: 'Lunch', slot: 'lunch' },
    { key: 'dinner', label: 'Dinner', slot: 'dinner' },
  ],
  4: [
    { key: 'breakfast', label: 'Breakfast', slot: 'breakfast' },
    { key: 'lunch', label: 'Lunch', slot: 'lunch' },
    { key: 'snack-1', label: 'Snack', slot: 'snack' },
    { key: 'dinner', label: 'Dinner', slot: 'dinner' },
  ],
  5: [
    { key: 'breakfast', label: 'Breakfast', slot: 'breakfast' },
    { key: 'snack-1', label: 'Morning snack', slot: 'snack' },
    { key: 'lunch', label: 'Lunch', slot: 'lunch' },
    { key: 'snack-2', label: 'Afternoon snack', slot: 'snack' },
    { key: 'dinner', label: 'Dinner', slot: 'dinner' },
  ],
}

function suggestedMeals(day: number, mealCount: MealCount, appetite: Appetite) {
  return SLOT_LAYOUTS[mealCount].flatMap((slot, index) => {
    const candidates = MEALS.filter((meal) => meal.slot === slot.slot)
    const exact = candidates.filter((meal) => meal.appetite === appetite)
    const options = exact.length ? exact : candidates
    const meal = options[(day + index - 1) % options.length]
    return meal ? [{ ...slot, meal }] : []
  })
}

function PlanScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const [view, setView] = useState<HubView>('overview')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const plan = state.months[state.months.length - 1]

  if (!state.profile || !plan) return <NeedsPathway />

  const pathway = getPathway(state.profile.pathwayId)
  const today = Math.min(30, Math.max(1, dayOfMonth(plan)))
  const dayNumber = selectedDay ?? today
  const todayPlan = plan.days[today - 1] ?? plan.days[0]
  const activePlanDay = plan.days[dayNumber - 1] ?? todayPlan
  const mealCount = state.protein.mealsPerDay ?? pathway.defaultMeals
  const appetite = state.protein.appetite ?? pathway.defaultAppetite
  const checkpointDue = isCheckpointDue(state)
  const meals = suggestedMeals(activePlanDay.day, mealCount, appetite)

  const openPlan = (nextView: 'nutrition' | 'fitness') => {
    setSelectedDay(today)
    setView(nextView)
  }
  const selectDay = (day: number) => setSelectedDay(day)
  const moveDay = (offset: number) => setSelectedDay(Math.min(30, Math.max(1, dayNumber + offset)))
  const repeatPlan = () => {
    actions.continueCurrentMonth()
    setSelectedDay(null)
    setView('overview')
  }
  const updateMetrics = () => void navigate({ to: '/app/check-in' })

  const renewalPrompt = checkpointDue ? <CycleRenewal onRepeat={repeatPlan} onUpdate={updateMetrics} /> : null

  if (view === 'overview') {
    const nutritionDescription = pathway.id === 'glp1'
      ? 'Protein-first meals, smaller portions, and appetite-aware choices for every day.'
      : pathway.id === 'bariatric'
        ? 'Small, protein-led meals paced around your pathway and daily appetite.'
        : 'Balanced daily meals, practical portions, and steady protein anchors.'
    const fitnessDescription = pathway.id === 'glp1'
      ? 'A gentle, strength-first rhythm with deliberate recovery and lean-mass support.'
      : pathway.id === 'bariatric'
        ? 'Low-impact daily routines with recovery-aware movement and planned rest.'
        : 'Progressive strength, conditioning, active recovery, and full rest days.'

    return <div data-view-state="hub-workspace" className="flex h-screen max-h-full min-h-0 w-full flex-col justify-between overflow-hidden bg-[#0B0F19] px-4 py-3 text-white select-none sm:px-6 sm:py-4">
      <header className="shrink-0 pt-1 text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-400">{pathway.name.toUpperCase()} WORKSPACE</p>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">Your 30-day workspace</h1>
        <p className="text-sm text-gray-400">{pathway.tagline}</p>
      </header>

      <section aria-label="30-day tracks" className="mx-auto my-auto grid min-h-0 w-full max-w-4xl grid-cols-2 items-center gap-3 sm:gap-6">
        <TrackCard
          title="Nutrition"
          description={nutritionDescription}
          icon={<Utensils className="h-7 w-7 text-blue-400 sm:h-8 sm:w-8" />}
          onOpen={() => openPlan('nutrition')}
        />
        <TrackCard
          title="Fitness"
          description={fitnessDescription}
          icon={<Dumbbell className="h-7 w-7 text-blue-400 sm:h-8 sm:w-8" />}
          onOpen={() => openPlan('fitness')}
        />
      </section>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-4 pb-2 pt-2 text-center text-xs text-gray-400">
        <span>© 2026 Proteus</span>
        <span aria-hidden="true" className="text-gray-600">•</span>
        <Link className="text-gray-400 transition-colors hover:text-white" to="/support" hash="faq">FAQ</Link>
        <span aria-hidden="true" className="text-gray-600">•</span>
        <Link className="text-gray-400 transition-colors hover:text-white" to="/support" hash="connect">Connect Us</Link>
        <span aria-hidden="true" className="text-gray-600">•</span>
        <Link className="text-gray-400 transition-colors hover:text-white" to="/privacy">Privacy Policy</Link>
        <span aria-hidden="true" className="text-gray-600">•</span>
        <Link className="text-gray-400 transition-colors hover:text-white" to="/terms">Terms of Use</Link>
      </footer>
      {renewalPrompt}
    </div>
  }

  const isNutrition = view === 'nutrition'
  const title = isNutrition ? 'Nutrition plan' : 'Fitness plan'

  return <div data-view-state={isNutrition ? 'nutrition-30-day-plan' : 'fitness-30-day-plan'} className="mx-auto flex h-full min-h-0 max-w-6xl flex-col overflow-hidden">
    <header className="flex shrink-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.035] text-white transition hover:border-volt/60 hover:text-volt-2" onClick={() => setView('overview')} aria-label="Back to Workspace"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-volt-2 sm:text-[9px]">Workspace · {isNutrition ? 'Nutrition' : 'Fitness'}</p>
          <h1 className="truncate font-display text-lg font-extrabold leading-tight text-white sm:text-2xl">{title}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white disabled:opacity-35" onClick={() => moveDay(-1)} disabled={dayNumber <= 1} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-[4.1rem] text-center text-[10px] font-bold text-white">Day {dayNumber} / 30</span>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white disabled:opacity-35" onClick={() => moveDay(1)} disabled={dayNumber >= 30} aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </header>

    <div className="mt-1 flex shrink-0 items-center justify-between gap-2 text-[9px] text-white sm:text-[10px]">
      <span className="truncate">{pathway.name} · Month {plan.monthIndex + 1} · {plan.phase}</span>
      <span className="inline-flex shrink-0 items-center gap-1"><CalendarDays className="h-3 w-3 text-volt-2" /> 30 days</span>
    </div>

    {isNutrition && <NutritionChoices
      className="mt-2 shrink-0"
      appetite={appetite}
      mealCount={mealCount}
      onAppetite={(value) => actions.setProtein({ appetite: value })}
      onMealCount={(value) => actions.setProtein({ mealsPerDay: value })}
    />}

    <DayPicker
      className="mt-2 shrink-0"
      days={plan.days}
      today={today}
      selected={dayNumber}
      monthIndex={plan.monthIndex}
      completed={state.completed}
      onSelect={selectDay}
    />

    {isNutrition
      ? <NutritionDayPanel className="mt-2 min-h-0 flex-1" appetite={appetite} meals={meals} mealCount={mealCount} pathway={pathway} plan={plan} day={activePlanDay} />
      : <FitnessDayPanel className="mt-2 min-h-0 flex-1" pathway={pathway} plan={plan} day={activePlanDay} completed={state.completed} />}

    <p className="mt-1 shrink-0 truncate text-center text-[8px] text-white sm:text-[9px]">Educational wellness guidance only · consult your qualified healthcare team for medical, medication, or post-surgical decisions.</p>
    {renewalPrompt}
  </div>
}

function TrackCard({ title, description, icon, onOpen }: {
  title: string
  description: string
  icon: ReactNode
  onOpen: () => void
}) {
  return <button
    type="button"
    onClick={onOpen}
    aria-label={`Open the 30-day ${title.toLowerCase()} plan`}
    className="group relative flex h-[360px] max-h-[calc(100dvh-16rem)] min-h-0 w-full min-w-0 flex-col justify-between rounded-3xl border-2 border-blue-500/40 bg-gradient-to-b from-[#111c38]/80 to-[#0d152a]/60 p-3 text-center shadow-[0_0_40px_rgba(59,130,246,0.2)] transition-all hover:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:p-6"
  >
    <div className="text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/40 bg-blue-500/20 text-blue-400 shadow-inner sm:h-14 sm:w-14">
        {icon}
      </span>
      <span className="mb-2 block text-2xl font-bold text-white">{title}</span>
      <span className="block px-2 text-sm leading-relaxed text-gray-300">{description}</span>
    </div>
    <span aria-hidden="true" className="mt-6 block w-full rounded-2xl border border-blue-400/50 bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:from-blue-500 hover:to-blue-400">Open Plan</span>
  </button>
}

function NutritionChoices({ className, appetite, mealCount, onAppetite, onMealCount }: {
  className?: string
  appetite: Appetite
  mealCount: MealCount
  onAppetite: (value: Appetite) => void
  onMealCount: (value: MealCount) => void
}) {
  return <section className={`grid grid-cols-[1.35fr,0.8fr] gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2 ${className ?? ''}`} aria-label="Nutrition plan options">
    <div className="min-w-0">
      <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white sm:text-[9px]">Appetite size</p>
      <div className="grid grid-cols-3 gap-1">
        {APPETITES.map((option) => <button key={option.value} type="button" className="seg min-h-7 px-1 py-1 text-[9px] font-bold capitalize sm:text-[10px]" aria-pressed={appetite === option.value} data-active={appetite === option.value} onClick={() => onAppetite(option.value)}>{option.label}</button>)}
      </div>
    </div>
    <div className="min-w-0">
      <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white sm:text-[9px]">Meals / day</p>
      <div className="grid grid-cols-3 gap-1">
        {([3, 4, 5] as const).map((number) => <button key={number} type="button" className="seg min-h-7 px-1 py-1 text-[9px] font-bold sm:text-[10px]" aria-pressed={mealCount === number} data-active={mealCount === number} onClick={() => onMealCount(number)}>{number}</button>)}
      </div>
    </div>
  </section>
}

function DayPicker({ className, days, today, selected, monthIndex, completed, onSelect }: {
  className?: string
  days: PlanDay[]
  today: number
  selected: number
  monthIndex: number
  completed: Record<string, true>
  onSelect: (day: number) => void
}) {
  return <section className={`rounded-2xl border border-white/10 bg-[#071126]/90 p-2 ${className ?? ''}`} aria-label="30-day plan calendar">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-volt-2">30-day sequence</p>
      <p className="truncate text-[8px] text-white">Tap a day to view its plan</p>
    </div>
    <div className="mt-1.5 grid grid-cols-10 gap-1">
      {days.map((day) => {
        const isSelected = day.day === selected
        const isToday = day.day === today
        const isComplete = Boolean(completed[`${monthIndex}:${day.day}`])
        return <button
          key={day.day}
          type="button"
          title={`Day ${day.day}: ${day.title}${day.type === 'Rest' ? ' · Rest day' : ''}`}
          aria-label={`${isToday ? 'Today, ' : ''}Day ${day.day}: ${day.title}${isComplete ? ', complete' : ''}`}
          aria-current={isToday ? 'date' : undefined}
          aria-pressed={isSelected}
          onClick={() => onSelect(day.day)}
          className={`h-7 min-w-0 rounded-lg border text-[9px] font-bold transition sm:h-8 sm:text-[10px] ${isSelected ? 'border-volt/80 bg-volt/25 text-white shadow-[0_0_12px_rgba(61,139,255,.2)]' : isComplete ? 'border-emerald-400/45 bg-emerald-400/[0.08] text-emerald-100' : isToday ? 'border-amber-300/55 bg-amber-300/[0.06] text-white' : 'border-white/10 bg-white/[0.025] text-white/75 hover:border-volt/50'}`}
        >{day.day}</button>
      })}
    </div>
  </section>
}

function NutritionDayPanel({ className, appetite, meals, mealCount, pathway, plan, day }: {
  className?: string
  appetite: Appetite
  meals: { key: string; label: string; slot: MealSlot; meal: Meal }[]
  mealCount: MealCount
  pathway: Pathway
  plan: MonthPlan
  day: PlanDay
}) {
  return <section className={`panel flex min-h-0 flex-col overflow-hidden p-2.5 sm:p-4 ${className ?? ''}`} aria-label={`Nutrition for day ${day.day}`}>
    <header className="flex shrink-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-volt-2 sm:text-[9px]">Day {day.day} · {pathway.short}</p>
        <h2 className="mt-0.5 truncate font-display text-sm font-bold text-white sm:text-lg">{day.day === 1 ? 'Your first-day meal rhythm' : `Day ${day.day} meal rhythm`}</h2>
        <p className="truncate text-[8px] text-white sm:text-[10px]">Focus: {pathway.essentials[0]?.title ?? pathway.tagline}</p>
      </div>
      <div className="shrink-0 rounded-lg border border-volt/25 bg-volt/[0.07] px-2 py-1 text-right">
        <p className="font-display text-[10px] font-bold text-white sm:text-xs">{plan.proteinTarget} g protein</p>
        <p className="text-[8px] text-white sm:text-[9px]">{plan.calories.toLocaleString()} kcal target</p>
      </div>
    </header>
    <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-hidden">
      {meals.map((entry) => <article key={entry.key} title={`${entry.label}: ${entry.meal.name}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-2 py-1.5">
        <div className="min-w-0">
          <p className="text-[7px] font-bold uppercase tracking-wider text-volt-2 sm:text-[8px]">{entry.label}</p>
          <p className="truncate text-[10px] font-semibold leading-tight text-white sm:text-xs">{entry.meal.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-bold text-white sm:text-[9px]">{entry.meal.protein} g P · {entry.meal.kcal} kcal</p>
          <p className="inline-flex items-center gap-0.5 text-[7px] text-white sm:text-[8px]"><Clock className="h-2.5 w-2.5" /> {entry.meal.prepMin} min</p>
        </div>
      </article>)}
    </div>
    <p className="mt-1.5 shrink-0 truncate text-[8px] text-white sm:text-[9px]">{appetite[0].toUpperCase() + appetite.slice(1)} appetite · {mealCount} meals today · rotate day-to-day for variety</p>
  </section>
}

function FitnessDayPanel({ className, pathway, plan, day, completed }: {
  className?: string
  pathway: Pathway
  plan: MonthPlan
  day: PlanDay
  completed: Record<string, true>
}) {
  const isRest = day.type === 'Rest'
  const isComplete = Boolean(completed[`${plan.monthIndex}:${day.day}`])
  return <section className={`panel flex min-h-0 flex-col overflow-hidden p-2.5 sm:p-4 ${className ?? ''}`} aria-label={`Fitness routine for day ${day.day}`}>
    <header className="flex shrink-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-volt-2 sm:text-[9px]">Day {day.day} · Week {Math.ceil(day.day / 7)} · {pathway.short}</p>
        <h2 className="mt-0.5 truncate font-display text-sm font-bold text-white sm:text-lg">{day.title}</h2>
        <p className="text-[9px] text-white sm:text-[10px]">{isRest ? 'Full rest day · 0 minutes' : `${day.type} · ${day.minutes} minutes`}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-volt/25 bg-volt/[0.07] px-2 py-1 text-[8px] font-bold text-volt-2 sm:text-[9px]">{isRest ? <HeartPulse className="h-3 w-3" /> : <Dumbbell className="h-3 w-3" />}{isRest ? 'RECOVERY' : 'TRAINING'}</span>
    </header>
    <ul className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-1.5">
      {day.blocks.map((block, index) => <li key={`${day.day}-${block}`} className="flex min-w-0 items-start gap-1.5 rounded-lg border border-white/10 bg-white/[0.025] px-2 py-1.5">
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-volt/35 bg-volt/[0.08] text-[7px] font-bold text-volt-2">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 text-[9px] leading-snug text-white sm:text-[11px]">{block}</span>
      </li>)}
    </ul>
    <div className="mt-2 grid shrink-0 grid-cols-[1fr,auto] items-center gap-2 border-t border-white/10 pt-2">
      <p className="min-w-0 text-[8px] leading-snug text-white sm:text-[9px]"><span className="font-bold text-volt-2">Daily cue · </span>{day.habit}</p>
      <button type="button" aria-pressed={isComplete} onClick={() => actions.toggleDay(plan.monthIndex, day.day)} className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2 py-1 text-[8px] font-bold transition sm:text-[9px] ${isComplete ? 'border-emerald-300/45 bg-emerald-300/10 text-emerald-100' : 'border-volt/45 bg-volt/[0.08] text-white hover:bg-volt/20'}`}>
        <CheckCircle2 className="h-3 w-3" />{isComplete ? 'Completed' : isRest ? 'Log recovery' : 'Mark done'}
      </button>
    </div>
  </section>
}

function CycleRenewal({ onRepeat, onUpdate }: { onRepeat: () => void; onUpdate: () => void }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#020611]/82 p-3 backdrop-blur-sm" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="cycle-renewal-title" className="w-full max-w-lg rounded-[1.5rem] border border-volt/55 bg-[#0b1733] p-4 shadow-[0_0_70px_rgba(61,139,255,.38)] sm:rounded-[2rem] sm:p-6">
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-volt-2"><RefreshCcw className="h-4 w-4" /> 30-day cycle complete</div>
      <h2 id="cycle-renewal-title" className="glow-title mt-2 font-display text-xl font-extrabold text-white sm:text-2xl">Choose your next rhythm</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-white sm:text-sm">Repeat the current plan as-is, or review updated metrics first so the next 30 days can be recalculated around you.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onRepeat} className="seg flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-xs font-bold"><RefreshCcw className="h-4 w-4 text-volt-2" /> Repeat current plan</button>
        <button type="button" onClick={onUpdate} className="btn-glow flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-xs font-bold"><Sparkles className="h-4 w-4" /> Update metrics & refresh</button>
      </div>
      <p className="mt-3 text-center text-[9px] text-white">A fresh plan uses the existing monthly check-in and evolution engine.</p>
    </section>
  </div>
}
