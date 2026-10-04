import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Dumbbell, Footprints, HeartPulse, ShieldCheck, Sparkles, TimerReset } from 'lucide-react'
import { NeedsPathway, PageHeader } from '@/components/PageHeader'
import { getPathway } from '@/lib/fixtures'
import { dayOfMonth } from '@/lib/engine'
import { actions, useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/fitness')({ component: FitnessScreen })

const THINKING_MS = 1500
const THINKING_MESSAGE = 'Proteus AI is running deep 30-day rhythm & GLP-1 movement calibration...'

type Exercise = {
  name: string
  block: string
  dose: string
  cue: string
  pacing: string
  recovery: string
}

function FitnessScreen() {
  const state = useAppState()
  const plan = state.months[state.months.length - 1]
  const [thinking, setThinking] = useState(true)
  const [thinkingProgress, setThinkingProgress] = useState(0)

  useEffect(() => {
    const started = window.performance.now()
    const tick = window.setInterval(() => {
      const elapsed = window.performance.now() - started
      setThinkingProgress(Math.min(100, Math.round((elapsed / THINKING_MS) * 100)))
    }, 60)
    const done = window.setTimeout(() => {
      setThinkingProgress(100)
      setThinking(false)
    }, THINKING_MS)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(done)
    }
  }, [])

  if (!state.profile || !plan) return <NeedsPathway />

  const pathway = getPathway(state.profile.pathwayId)
  const today = dayOfMonth(plan)
  const training = plan.days.filter((day) => day.type !== 'Rest')
  const completed = training.filter((day) => state.completed[`${plan.monthIndex}:${day.day}`]).length
  const weeks = Array.from({ length: 4 }, (_, index) => plan.days.slice(index * 7, index * 7 + 7))
  const glp1 = pathway.id === 'glp1'
  const exercises: Exercise[] = glp1
    ? [
        { name: 'Goblet squat', block: 'Lower-body strength', dose: '3 sets · 8–10 reps', cue: 'Brace gently, sit between your feet, stand tall.', pacing: '3 sec lower · smooth stand', recovery: '60–90 sec rest' },
        { name: 'Incline push-up', block: 'Upper-body push', dose: '3 sets · 8–12 reps', cue: 'Keep ribs stacked and finish each rep calmly.', pacing: 'Breathe out to press', recovery: '60 sec rest' },
        { name: 'Supported row', block: 'Upper-body pull', dose: '3 sets · 10 reps / side', cue: 'Pull elbow toward the back pocket without twisting.', pacing: '1 sec squeeze · controlled return', recovery: '60 sec rest' },
        { name: 'Romanian deadlift', block: 'Posterior chain', dose: '3 sets · 8–10 reps', cue: 'Hinge from the hips and keep the load close.', pacing: 'Slow hinge · 2 reps in reserve', recovery: '90 sec rest' },
        { name: 'Step-up + balance', block: 'Single-leg control', dose: '2 sets · 6 reps / side', cue: 'Use support as needed; own the landing.', pacing: 'Quiet step · nasal breathing', recovery: '60 sec rest' },
        { name: 'Carry + reset', block: 'Finisher / capacity', dose: '3 rounds · 30–45 sec', cue: 'Walk tall, relax your shoulders, stop before strain.', pacing: 'Conversational pace', recovery: 'Reset fully between rounds' },
      ]
    : [
        { name: 'Sit-to-stand', block: 'Lower-body strength', dose: '3 sets · 8–10 reps', cue: 'Use a chair height that keeps the movement repeatable.', pacing: 'Controlled lower · steady stand', recovery: '60 sec rest' },
        { name: 'Wall push-up', block: 'Upper-body push', dose: '3 sets · 8–12 reps', cue: 'Keep your body long and your breath easy.', pacing: 'Smooth tempo · easy breathing', recovery: '60 sec rest' },
        { name: 'Supported row', block: 'Upper-body pull', dose: '3 sets · 10 reps / side', cue: 'Move the elbow, not the shoulder, toward your ribs.', pacing: '1 sec pause at the top', recovery: '60 sec rest' },
        { name: 'Hip hinge', block: 'Posterior chain', dose: '3 sets · 8–10 reps', cue: 'Reach hips back while keeping your spine comfortable.', pacing: 'Move slowly · stay comfortable', recovery: '90 sec rest' },
        { name: 'Low step-up', block: 'Balance + control', dose: '2 sets · 6 reps / side', cue: 'Hold a rail or wall until your balance feels steady.', pacing: 'Quiet foot placement', recovery: '60 sec rest' },
        { name: 'Easy carry', block: 'Finisher / capacity', dose: '3 rounds · 30 sec', cue: 'Keep the load light enough to speak in full sentences.', pacing: 'Relaxed pace · reset fully', recovery: 'Rest as needed' },
      ]

  return (
    <div data-view-state="workout-rewritten" aria-busy={thinking} className="relative">
      {thinking && <DeepThinkingOverlay progress={thinkingProgress} />}

      <PageHeader
        eyebrow={`${pathway.name} Fitness & Movement · Month ${plan.monthIndex + 1}`}
        title={`${pathway.name} movement plan`}
      >
        {glp1 ? 'A strength-first routine with intentional pacing, recovery windows, and energy-aware progression.' : pathway.id === 'bariatric' ? 'A gentle progression matched to recovery, hydration, and post-surgical restrictions.' : 'A progressive routine supported by consistency, natural movement, and repeatable recovery.'}
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<Activity className="h-5 w-5" />} label="Current phase" value={plan.phase} />
        <Metric icon={<Dumbbell className="h-5 w-5" />} label="Training sessions" value={`${completed}/${training.length} complete`} />
        <Metric icon={<Footprints className="h-5 w-5" />} label="Today's focus" value={plan.days[today - 1]?.title ?? 'Recovery'} />
      </div>

      <section className="panel mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-volt-2">Structured strength plan</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">Your 30-day movement anchor</h2>
            <p className="mt-1 max-w-3xl text-sm text-white">{glp1 ? 'Use controlled tempo, finish with energy in reserve, and treat recovery as part of the training plan.' : 'Choose the version that feels repeatable today, then progress only when the movement stays comfortable.'}</p>
          </div>
          <span className="chip"><HeartPulse className="h-3.5 w-3.5" /> {glp1 ? 'GLP-1 pacing' : `${pathway.name} pacing`}</span>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {exercises.map((exercise, index) => (
            <article key={exercise.name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-volt/50">
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-volt/45 bg-volt/10 text-[10px] font-bold text-volt-2">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-volt-2">{exercise.block}</span>
              </div>
              <h3 className="mt-3 font-display text-base font-bold text-white">{exercise.name}</h3>
              <p className="mt-1 text-xs font-bold text-volt-2">{exercise.dose}</p>
              <p className="mt-2 text-xs leading-relaxed text-white">{exercise.cue}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-[10px] text-white">
                <span><strong className="block text-volt-2">Pacing</strong>{exercise.pacing}</span>
                <span><strong className="block text-volt-2">Recovery</strong>{exercise.recovery}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Guidance icon={<TimerReset className="h-4 w-4" />} label="Effort ceiling" value="Stop with 2 reps in reserve" />
          <Guidance icon={<HeartPulse className="h-4 w-4" />} label="Breathing" value="Exhale on effort; no breath holding" />
          <Guidance icon={<ShieldCheck className="h-4 w-4" />} label="Recovery rule" value="Swap or stop if symptoms appear" />
        </div>
      </section>

      <section className="panel mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold text-white">30-day movement map</h2><p className="mt-1 text-sm text-white">Tap a day to mark the session complete.</p></div>
          <span className="chip">Day {today} of 30</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {weeks.map((week, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-volt-2">Week {index + 1}</p>
              <div className="mt-2 space-y-1.5">
                {week.map((day) => {
                  const done = !!state.completed[`${plan.monthIndex}:${day.day}`]
                  return <button key={day.day} type="button" onClick={() => actions.toggleDay(plan.monthIndex, day.day)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${done ? 'border-volt/60 bg-volt/15' : 'border-white/10 bg-black/10 hover:border-volt/50'}`}><span><span className="mr-2 text-xs font-bold text-volt-2">D{day.day}</span><span className="font-semibold text-white">{day.title}</span><span className="mt-0.5 block text-xs text-white">{day.type} · {day.minutes ? `${day.minutes} min` : 'Rest day'}</span></span>{done && <CheckCircle2 className="h-5 w-5 shrink-0 text-volt-2" />}</button>
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-4 text-center text-xs leading-relaxed text-white">Proteus provides general wellness education only. Stop if you feel unwell and consult a qualified healthcare professional before changing exercise, medication, or post-surgical restrictions.</p>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="panel flex items-center gap-3 p-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-volt/40 bg-volt/10 text-volt-2">{icon}</span><div><p className="text-[10px] uppercase tracking-wider text-white">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div></div>
}

function Guidance({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5"><span className="mt-0.5 text-volt-2">{icon}</span><span><strong className="block text-[10px] uppercase tracking-wider text-volt-2">{label}</strong><span className="mt-0.5 block text-xs text-white">{value}</span></span></div>
}

function DeepThinkingOverlay({ progress }: { progress: number }) {
  return <div data-overlay="workout-deep-thinking" className="fixed inset-0 z-[75] grid place-items-center bg-[#020611]/88 p-5 backdrop-blur-md" role="status" aria-live="polite"><section className="screen-enter w-full max-w-lg rounded-[2rem] border border-volt/60 bg-[#0b1733] p-8 text-center shadow-[0_0_110px_rgba(61,139,255,.52)]"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-volt/60 bg-volt/15 text-volt-2 shadow-[0_0_34px_rgba(61,139,255,.62)]"><Sparkles className="h-8 w-8 animate-pulse" /></div><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-volt-2">Proteus AI · deep thinking</p><h2 className="glow-title mt-2 font-display text-3xl font-extrabold text-white">Calibrating your strength rhythm</h2><p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white">{THINKING_MESSAGE}</p><div className="mx-auto mt-7 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-volt-2 shadow-[0_0_16px_#6fb6ff] transition-[width] duration-100" style={{ width: `${progress}%` }} /></div><p className="mt-4 text-[11px] text-white">Balancing intensity, pacing, recovery, and lean-mass support.</p></section></div>
}
