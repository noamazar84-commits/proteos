import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { PathwayIcon } from '@/components/PathwayIcon'
import { PATHWAYS, type PathwayId } from '@/lib/fixtures'
import { maintenanceCalories, type Activity, type DietaryPreference } from '@/lib/engine'
import { actions, useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/')({
  validateSearch: (search: Record<string, unknown>): { pathway?: PathwayId } =>
    PATHWAYS.some((pathway) => pathway.id === search.pathway) ? { pathway: search.pathway as PathwayId } : {},
  component: Pathways,
})

function Pathways() {
  const state = useAppState()
  const navigate = useNavigate()
  const { pathway: fromLanding } = Route.useSearch()
  const selected = fromLanding ?? null
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference | null>(state.dietaryPreference)
  const [weight, setWeight] = useState(state.profile?.weightKg ?? 95)
  const [goal, setGoal] = useState(state.profile?.goalWeightKg ?? 80)
  const [activity, setActivity] = useState<Activity>(state.profile?.activity ?? 'moderate')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pathway = PATHWAYS.find((item) => item.id === selected)
  const protein = pathway
    ? Math.max(pathway.proteinFloor, Math.round((Math.min(weight, goal * 1.15) * pathway.proteinPerKg) / 5) * 5)
    : 0
  const kcal = pathway ? Math.round((maintenanceCalories(weight, activity) * (1 + pathway.calorieShift)) / 10) * 10 : 0

  useEffect(() => {
    if (!selected || selected === state.profile?.pathwayId) return
    setGoal(Math.round(weight * (selected === 'bariatric' ? 0.7 : selected === 'glp1' ? 0.8 : 0.88)))
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: PathwayId) => {
    setDietaryPreference(dietaryPreference)
    void navigate({ to: '/app', search: { pathway: id } })
  }

  const generate = async () => {
    if (!selected || saving) return
    if (goal >= weight) return setError('Your goal weight should be below your current weight for this pathway.')
    if (state.months.length > 1 && !confirm('Switching pathway restarts your program at Month 1. Continue?')) return

    setSaving(true)
    setError(null)
    try {
      if (!import.meta.env.DEV) {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pathway: selected, currentWeightKg: weight, goalWeightKg: goal, activity }),
        })
        const body = await response.json().catch(() => ({})) as { error?: string }
        if (!response.ok) throw new Error(body.error ?? `Your profile could not be saved (${response.status}).`)
      }
      actions.startPathway({ pathwayId: selected, dietaryPreference: dietaryPreference ?? undefined, weightKg: weight, goalWeightKg: goal, activity })
      navigate({ to: '/app/plan' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your profile could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stage relative flex h-dvh flex-col overflow-hidden">
      {import.meta.env.DEV && !pathway && <Link to="/" className="seg absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 text-xs sm:left-6 sm:top-6 sm:text-sm">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>}
      {!pathway && <header className="rise mx-auto max-w-4xl flex-none px-4 pt-7 text-center sm:pt-9">
        <h1 className="glow-title font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Choose your pathway</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-white sm:text-2xl sm:leading-relaxed">
          <span className="block">Choose the pathway that fits your starting point.</span>
          <span className="block">Build a focused protein-first plan with practical guidance.</span>
          <span className="block">Start with the support that meets you where you are.</span>
        </p>
      </header>}

      {pathway && (
        <div className="rise mx-auto max-w-3xl text-center">
          <Link to="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/55 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All pathways
          </Link>
          <div className="mt-6 flex justify-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-volt bg-volt/20 shadow-[0_0_30px_rgba(61,139,255,0.5)]">
              <PathwayIcon id={pathway.id} className="h-7 w-7 text-volt-2" />
            </span>
          </div>
          <span className="chip mt-5">{pathway.tagline}</span>
          <h1 className="glow-title font-display mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{pathway.name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/75 sm:text-lg">{pathway.description}</p>
          <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
            {pathway.essentials.map((essential) => (
              <div key={essential.title} className="rounded-xl border border-volt/20 bg-volt/[0.06] p-4">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Check className="h-4 w-4 text-volt-2" /> {essential.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{essential.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!pathway && <section className="mx-auto mt-3 w-full max-w-5xl flex-none px-3 sm:mt-4 sm:px-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {PATHWAYS.map((item, index) => (
            <article
              key={item.id}
              className="group flex h-[20rem] flex-col items-center rounded-2xl border border-volt-2/75 bg-gradient-to-b from-volt/[0.18] via-[#10234b] to-[#080d1b] p-6 text-center shadow-[0_0_28px_rgba(61,139,255,0.28),inset_0_0_28px_rgba(111,182,255,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#b8e6ff] hover:bg-volt/[0.24] hover:shadow-[0_0_42px_rgba(61,180,255,0.55),inset_0_0_34px_rgba(111,182,255,0.14)] sm:h-[25rem] sm:p-8"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-volt/50 bg-volt/10 shadow-[0_0_18px_rgba(61,139,255,0.3)] sm:h-16 sm:w-16">
                <PathwayIcon id={item.id} className="h-6 w-6 text-volt-2 sm:h-8 sm:w-8" />
              </span>
                <h2 className="font-display mt-5 text-lg font-extrabold leading-tight text-white sm:mt-6 sm:text-3xl">{item.name}</h2>
                <p className="mt-3 text-sm font-bold leading-tight text-ice sm:mt-4 sm:text-lg">{item.tagline}</p>
              <button
                type="button"
                onClick={() => choose(item.id)}
                className="btn-glow btn-sm mt-auto w-full px-3 py-3 text-sm sm:px-5 sm:py-4 sm:text-lg"
              >
                Start Here
              </button>
            </article>
          ))}
        </div>
      </section>}

      {pathway && (
        <section className="panel rise mx-auto mt-8 max-w-3xl p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Tailor your {pathway.name} plan</h2>
          <p className="mt-2 text-sm text-white/65">We use this to size your calories, protein and training load for Month 1.</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white/80">Current weight · {weight} kg</span>
              <input type="range" className="range mt-3" min={40} max={180} value={weight} onChange={(event) => setWeight(+event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white/80">Goal weight · {goal} kg</span>
              <input type="range" className="range mt-3" min={40} max={180} value={goal} onChange={(event) => setGoal(+event.target.value)} />
            </label>
          </div>

          <div className="mt-7">
            <span className="text-sm font-semibold text-white/80">Daily activity outside training</span>
            <div className="mt-3 flex justify-center gap-2">
              {(['low', 'moderate', 'high'] as const).map((level) => (
                <button key={level} className="seg capitalize" data-active={activity === level} onClick={() => setActivity(level)}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <Stat label="Daily protein" value={`${protein} g`} />
            <Stat label="Calories" value={`${kcal.toLocaleString()}`} />
            <Stat label="Training" value={`${activity === 'low' ? Math.max(3, pathway.trainingDays - 1) : pathway.trainingDays} d/wk`} />
          </div>

          {error && <p className="mt-5 text-sm text-rose-300" role="alert">{error}</p>}
          <button onClick={() => void generate()} className="btn-glow mt-9" disabled={saving}>
            <Sparkles className="h-5 w-5" /> {saving ? 'Saving your profile…' : 'Generate my 30-day plan'}
          </button>
        </section>
      )}

      {!pathway && <footer className="relative z-10 mt-auto flex flex-none flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pb-5 pt-7 text-sm font-semibold text-white sm:text-base">
        <span className="font-bold text-white">© 2026 Proteus</span>
        <Link className="text-white hover:text-volt-2" to="/support" hash="faq">FAQ</Link>
        <Link className="text-white hover:text-volt-2" to="/support" hash="connect">Connect Us</Link>
        <Link className="text-white hover:text-volt-2" to="/privacy">Privacy Policy</Link>
        <Link className="text-white hover:text-volt-2" to="/terms">Terms of Use</Link>
      </footer>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-4">
      <div className="glow-text font-display text-xl font-bold sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-white/50">{label}</div>
    </div>
  )
}
