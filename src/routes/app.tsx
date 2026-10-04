import { Link, Navigate, Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { Activity, ArrowLeft, ArrowRight, Bot, Camera, Compass, CreditCard, Dumbbell, FileImage, LogOut, Menu, RefreshCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LegalFooter } from '@/components/LegalFooter'
import { Logo } from '@/components/Logo'
import { TrialGate } from '@/components/TrialGate'
import { signOut } from '@/lib/auth'
import { actions, useAppState, useHydrated, type AppState } from '@/lib/store'
import type { PathwayId } from '@/lib/fixtures'
import type { Activity as ActivityLevel, DietaryPreference } from '@/lib/engine'
import { mockCoachResponse, mockMealResponse, normalizePathway, safeAppState, shouldRenderSidebar } from '@/lib/screen3-flow'

export const Route = createFileRoute('/app')({ component: Screen3 })

type Stage = 'welcome_screen' | 'setup_wizard'
type PlanInput = { pathwayId: PathwayId; dietaryPreference: DietaryPreference; weightKg: number; goalWeightKg: number; activity: ActivityLevel; proteinPerKg: number; startingStatus: string; milestone: string; dailySteps: number }
type Track = { name: string; eyebrow: string; title: string; body: string; bullets: string[]; detail: string }


const TRACKS: Record<PathwayId, Track> = {
  glp1: { name: 'GLP-1', eyebrow: 'GLP-1 track · gentle habit support', title: 'Welcome aboard, GLP-1', body: 'Build a calm, repeatable rhythm around protein anchors, hydration, and practical daily coaching. Proteus keeps the focus on habits—not medical advice.', bullets: ['Protein anchors to support lean mass', 'Hydration and routine cues', 'Gentle appetite-awareness prompts'], detail: 'Whole-food protein · hydration · steady habits' },
  bariatric: { name: 'Sleeve', eyebrow: 'Sleeve track · mindful nutrition', title: 'Welcome aboard, Sleeve', body: 'Create a mindful monthly rhythm around smaller volumes, clean protein anchors, and a pace that feels sustainable for your day.', bullets: ['Small-volume meal structure', 'Clean protein anchors per meal', 'Mindful pacing and hydration'], detail: 'Whole-food textures · tiny portions · hydration' },
  general: { name: 'General', eyebrow: 'General track · sustainable consistency', title: 'Welcome aboard, General', body: 'Turn whole-food choices and daily consistency into a clear 30-day rhythm, with one practical next step always in front of you.', bullets: ['Whole, minimally processed foods', 'Consistency over perfection', 'Simple movement signals'], detail: 'Whole-food macros · hydration · plateaus' },
}


function readPathway(href: string): PathwayId | null {
  try { const value = new URL(href || '/', 'http://proteus.local').searchParams.get('pathway'); return normalizePathway(value) } catch { return null }
}

function Screen3() {
  const hydrated = useHydrated()
  const state = safeAppState(useAppState())
  const navigate = useNavigate()
  const location = useRouterState({ select: (router) => router.location })
  const queryPathway = readPathway(location.href)
  const [stage, setStage] = useState<Stage>('welcome_screen')
  const [newFlow, setNewFlow] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const onboardingPathway = queryPathway ?? (newFlow ? normalizePathway(state.profile?.pathwayId) : null)

  useEffect(() => {
    const reset = () => { setStage('welcome_screen'); setNewFlow(true) }
    const scan = () => setScannerOpen(true)
    window.addEventListener('proteus:new-monthly-flow', reset)
    window.addEventListener('proteus:open-meal-scanner', scan)
    return () => { window.removeEventListener('proteus:new-monthly-flow', reset); window.removeEventListener('proteus:open-meal-scanner', scan) }
  }, [])

  if (!hydrated) return <Loading />
  if (!state.user) return <Navigate to="/" />
  if (calibrating) return <PlanCalibration track={TRACKS[onboardingPathway ?? 'general']} />
  if (!state.profile && !queryPathway) {
    if (location.pathname !== '/app') return <Navigate to="/app" replace />
    return <div className="stage min-h-dvh"><Outlet /></div>
  }
  const pathwayId = onboardingPathway ?? normalizePathway(state.profile?.pathwayId) ?? 'general'
  if (onboardingPathway) return <Onboarding track={TRACKS[pathwayId]} stage={stage} setStage={setStage} onBack={() => { setStage('welcome_screen'); setNewFlow(false); void navigate({ to: '/app' }) }} onComplete={(input) => { setCalibrating(true); window.setTimeout(() => { const { proteinPerKg, ...profile } = input; actions.startPathway(profile); actions.setProtein({ perKg: proteinPerKg }); setNewFlow(false); setCalibrating(false); void navigate({ to: '/app/plan' }) }, 7500) }} />
  if (location.pathname === '/app') return <div className="stage min-h-dvh"><Outlet /></div>
  if (!shouldRenderSidebar({ hydrated, hasUser: Boolean(state.user), hasProfile: Boolean(state.profile), onboarding: Boolean(onboardingPathway) })) return <div className="stage min-h-dvh"><Outlet /></div>
  return <Workspace track={TRACKS[normalizePathway(state.profile?.pathwayId) ?? 'general']} state={state} scannerOpen={scannerOpen} setScannerOpen={setScannerOpen} onNewFlow={() => { setStage('welcome_screen'); setNewFlow(true); }} />
}

function Loading() { return <div className="stage grid min-h-dvh place-items-center"><div className="panel p-8 text-center"><Sparkles className="mx-auto h-8 w-8 animate-pulse text-volt-2" /><p className="mt-3 text-sm text-white">Restoring your Proteus workspace…</p></div></div> }

function PlanCalibration({ track }: { track: Track }) {
  const statuses = ['Analyzing your pathway...', 'Synthesizing 30-day nutrition matrix...', 'Assembling progressive fitness milestones...', 'Linking daily tracking and AI support...', 'Finalizing your unified dashboard...']
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setStep((value) => Math.min(statuses.length - 1, value + 1)), 1450)
    return () => window.clearInterval(timer)
  }, [])
  return <div data-overlay="plan-generation-calibration" className="fixed inset-0 z-[90] grid place-items-center bg-[#020611]/92 p-5 backdrop-blur-md" role="status" aria-live="polite"><section className="screen-enter w-full max-w-xl rounded-[2rem] border border-volt/60 bg-[#0b1733] p-8 text-center shadow-[0_0_120px_rgba(61,139,255,.58)]"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-volt/60 bg-volt/15 text-volt-2 shadow-[0_0_36px_rgba(61,139,255,.65)]"><Sparkles className="h-8 w-8 animate-pulse" /></div><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-volt-2">Proteus AI · unified pathway generator</p><h1 className="glow-title mt-2 font-display text-3xl font-extrabold text-white">Calibrating your 30-day rhythm</h1><p className="mx-auto mt-4 min-h-6 max-w-md text-sm leading-relaxed text-white">{statuses[step]}</p><div className="mx-auto mt-7 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-volt-2 shadow-[0_0_18px_#6fb6ff] transition-all duration-500" style={{ width: `${((step + 1) / statuses.length) * 100}%` }} /></div><div className="mt-6 grid grid-cols-2 gap-2 text-left text-xs text-white"><span className="rounded-xl border border-white/10 bg-white/[0.04] p-3">{track.name} nutrition<br /><strong className="text-volt-2">Protein + daily meals</strong></span><span className="rounded-xl border border-white/10 bg-white/[0.04] p-3">{track.name} fitness<br /><strong className="text-volt-2">Strength + recovery</strong></span></div><p className="mt-5 text-[11px] text-white">Building your dashboard sync, scanner log, AI support, and day-30 review checkpoint.</p></section></div>
}

function Onboarding({ track, stage, setStage, onBack, onComplete }: { track: Track; stage: Stage; setStage: (stage: Stage) => void; onBack: () => void; onComplete: (input: PlanInput) => void }) {
  return stage === 'welcome_screen' ? <Welcome track={track} onBack={onBack} onStart={() => setStage('setup_wizard')} /> : <Wizard track={track} onBack={() => setStage('welcome_screen')} onComplete={onComplete} />
}

function Welcome({ track, onBack, onStart }: { track: Track; onBack: () => void; onStart: () => void }) {
  return <div data-view-state="welcome_screen" className="stage relative grid h-dvh place-items-center overflow-hidden p-3 sm:p-5"><button type="button" onClick={onBack} className="seg absolute left-3 top-3 inline-flex items-center gap-1.5 text-xs sm:left-5 sm:top-5"><ArrowLeft className="h-3.5 w-3.5" /> Back</button><section className="screen-enter w-full max-w-3xl rounded-[2rem] border border-volt/40 bg-gradient-to-br from-volt/20 to-[#071126] px-6 py-10 text-center shadow-[0_0_70px_rgba(61,139,255,.16)] sm:px-12 sm:py-14"><p className="text-xs font-bold uppercase tracking-[0.18em] text-volt-2">{track.eyebrow}</p><h1 className="glow-title mt-5 font-display text-5xl font-extrabold leading-[.95] sm:text-7xl">{track.title}</h1><p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white sm:text-lg">{track.body} <span className="text-white/75">{track.bullets.join(' · ')}</span></p><button type="button" className="btn-glow mt-8" onClick={onStart}>Let&apos;s Build Your Plan <ArrowRight className="h-4 w-4" /></button></section></div>
}

function Wizard({ track, onBack, onComplete }: { track: Track; onBack: () => void; onComplete: (input: PlanInput) => void }) {
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState('Starting fresh')
  const [proteinFocus, setProteinFocus] = useState<'protein_first' | 'flexible' | 'whole_food' | null>(null)
  const [movement, setMovement] = useState<'gentle' | 'steady' | 'energized' | null>(null)
  const statusCards = [
    { value: 'Starting fresh', label: 'Starting fresh', detail: 'I want a simple rhythm I can trust.', icon: '✦' },
    { value: 'Finding my rhythm', label: 'Finding my rhythm', detail: 'I have some habits and want them to stick.', icon: '↗' },
    { value: 'Rebuilding consistency', label: 'Rebuilding consistency', detail: 'I am returning with a clean, calm reset.', icon: '↺' },
  ] as const
  const proteinCards = [
    { value: 'protein_first', label: 'Protein first', detail: 'Anchor each meal around a clear protein choice.', protein: 1.8, food: 'high_protein' as DietaryPreference, icon: '◈' },
    { value: 'flexible', label: 'Flexible balance', detail: 'Keep the plan practical with room for real life.', protein: 1.6, food: 'flexible_80_20' as DietaryPreference, icon: '◌' },
    { value: 'whole_food', label: 'Whole-food rhythm', detail: 'Keep meals close to simple, minimally processed foods.', protein: 1.5, food: 'whole_food' as DietaryPreference, icon: '◇' },
  ] as const
  const movementCards = [
    { value: 'gentle', label: 'Gentle start', detail: 'Light movement and small wins feel right.', activity: 'low' as ActivityLevel, steps: 4000, icon: '○' },
    { value: 'steady', label: 'Steady rhythm', detail: 'I can make a moderate daily baseline repeatable.', activity: 'moderate' as ActivityLevel, steps: 6000, icon: '◎' },
    { value: 'energized', label: 'Energized', detail: 'I am ready to build around a higher activity baseline.', activity: 'high' as ActivityLevel, steps: 8500, icon: '✧' },
  ] as const
  const selected = step === 1 ? status : step === 2 ? proteinFocus : movement
  const canContinue = Boolean(selected)
  const next = () => {
    if (!canContinue) return
    if (step < 3) setStep((value) => value + 1)
    else {
      const proteinCard = proteinCards.find((card) => card.value === proteinFocus) ?? proteinCards[1]
      const movementCard = movementCards.find((card) => card.value === movement) ?? movementCards[1]
      onComplete({ pathwayId: track.name === 'GLP-1' ? 'glp1' : track.name === 'Sleeve' ? 'bariatric' : 'general', dietaryPreference: proteinCard.food, weightKg: 95, goalWeightKg: 80, activity: movementCard.activity, proteinPerKg: proteinCard.protein, startingStatus: status, milestone: step === 3 ? 'Day 1 · ready to begin' : 'Week 1 · building my rhythm', dailySteps: movementCard.steps })
    }
  }
  return <div data-view-state="setup_wizard" className="stage grid h-dvh place-items-center overflow-hidden p-3 sm:p-5"><section className="w-full max-w-2xl"><div className="mb-3 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-volt-2">{track.name} · Your 30-day setup</p><p className="mt-1 text-xs text-white">One clear choice at a time.</p></div><span className="chip">{step} / 3</span></div><div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-volt-2 shadow-[0_0_14px_#6fb6ff] transition-all duration-500" style={{ width: `${step / 3 * 100}%` }} /></div><div key={step} className="screen-enter rounded-[1.5rem] border border-volt/35 bg-[#0b1733]/88 p-4 shadow-[0_0_50px_rgba(61,139,255,.14)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-volt-2">{step === 1 ? 'Your starting point' : step === 2 ? 'Your nutrition anchor' : 'Your movement rhythm'}</p><h1 className="glow-title mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">{step === 1 ? 'Where are you starting?' : step === 2 ? 'What should fuel this month?' : 'How do you want to move?'}</h1><p className="mt-1 max-w-xl text-xs leading-relaxed text-white">{step === 1 ? 'Choose the sentence that feels most like today.' : step === 2 ? `Choose the nutrition anchor that fits your ${track.name} pathway.` : 'Choose a baseline you can repeat without friction.'}</p><div className="mt-3 grid gap-1.5">{step === 1 && statusCards.map((card) => <SelectionCard key={card.value} active={status === card.value} icon={card.icon} label={card.label} detail={card.detail} onClick={() => setStatus(card.value)} />)}{step === 2 && proteinCards.map((card) => <SelectionCard key={card.value} active={proteinFocus === card.value} icon={card.icon} label={card.label} detail={card.detail} onClick={() => setProteinFocus(card.value)} />)}{step === 3 && movementCards.map((card) => <SelectionCard key={card.value} active={movement === card.value} icon={card.icon} label={card.label} detail={card.detail} onClick={() => setMovement(card.value)} />)}</div><div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="seg" onClick={() => step === 1 ? onBack() : setStep((value) => value - 1)}>← Back</button><button type="button" className="btn-glow btn-sm justify-center disabled:cursor-not-allowed disabled:opacity-40" disabled={!canContinue} onClick={next}>{step === 3 ? <><Sparkles className="h-4 w-4" /> Generate My 30-Day Plan</> : <>Continue <ArrowRight className="h-4 w-4" /></>}</button></div></div><p className="mt-3 text-center text-[11px] text-white">You can refine your plan later from Settings.</p></section></div>
}

function SelectionCard({ active, icon, label, detail, onClick }: { active: boolean; icon: string; label: string; detail: string; onClick: () => void }) { return <button type="button" aria-pressed={active} className="selection-card group flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.035] p-2.5 text-left hover:-translate-y-0.5 hover:border-volt/65 hover:bg-volt/[0.1] sm:p-3" data-active={active} onClick={onClick}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-xl transition ${active ? 'border-volt/80 bg-volt/25 text-volt-2 shadow-[0_0_22px_rgba(61,139,255,.35)]' : 'border-white/20 bg-white/[0.05] text-white group-hover:border-volt/50'}`}>{icon}</span><span className="min-w-0"><strong className="block text-base font-bold text-white sm:text-base">{label}</strong><small className="mt-0.5 block text-xs leading-snug text-white">{detail}</small></span><span className={`ml-auto hidden h-5 w-5 shrink-0 place-items-center rounded-full border text-xs sm:grid ${active ? 'border-volt-2 bg-volt-2 text-[#06112a]' : 'border-white/25 text-transparent'}`}>✓</span></button> }

function Workspace({ track, state, scannerOpen, setScannerOpen, onNewFlow }: { track: Track; state: AppState; scannerOpen: boolean; setScannerOpen: (open: boolean) => void; onNewFlow: () => void }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (router) => router.location.pathname })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const isDashboardUnlocked = shouldRenderSidebar({ hydrated: true, hasUser: Boolean(state.user), hasProfile: Boolean(state.profile), onboarding: false })
  const navItems = [{ to: '/app/plan', label: `${track.name} Dashboard`, detail: 'My 30-Day Plan', icon: Compass }, { to: '/app/protein', label: track.name + ' Nutrition', detail: track.detail, icon: Dumbbell }, { to: '/app/fitness', label: track.name + ' Movement', detail: 'Daily training · adherence', icon: Activity }, { to: '/app/support', label: track.name + ' AI Coach', detail: 'Daily check-ins · guidance', icon: Bot }, { to: '/app/check-in', label: 'Progress Review', detail: 'Adaptive checkpoint', icon: RefreshCcw }, { to: '/app/settings', label: 'Settings & Account', detail: 'Subscription · profile', icon: CreditCard }] as const
  if (!isDashboardUnlocked) return null
  return <div data-view-state="active_dashboard" className="screen-enter dashboard-shell stage h-dvh overflow-hidden"><div className="grid-overlay" aria-hidden /><aside className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-72 flex-col overflow-hidden border-r border-volt/40 bg-[#070C18]/98 px-4 py-4 shadow-[12px_0_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}><div className="shrink-0 rounded-2xl border border-volt/35 bg-gradient-to-br from-volt/15 to-transparent p-3 shadow-[0_0_28px_rgba(61,139,255,0.14)]"><Link to="/" className="inline-block"><Logo size="sm" /></Link><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-volt-2">{track.name} workspace</p><p className="mt-1 text-[11px] leading-tight text-white">{track.detail}</p></div><nav aria-label="Dashboard navigation" className="mt-3 min-h-0 flex-1 space-y-1 overflow-hidden">{navItems.map(({ to, label, detail, icon: Icon }) => <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="group flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.025] px-2.5 py-2.5 text-xs font-semibold text-white transition hover:border-volt/65 hover:bg-volt/15" activeProps={{ className: 'group flex items-center gap-2.5 rounded-xl border border-volt/70 bg-gradient-to-r from-volt/25 to-volt/10 px-2.5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_rgba(61,139,255,0.35)]' }}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-volt/45 bg-volt/15"><Icon className="h-3.5 w-3.5 text-volt-2" /></span><span>{label}<small className="mt-0.5 block text-[9px] font-normal text-white">{detail}</small></span></Link>)}<button type="button" onClick={() => setScannerOpen(true)} className="group flex w-full items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.025] px-2.5 py-2.5 text-left text-xs font-semibold text-white transition hover:border-volt/65 hover:bg-volt/15"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-volt/45 bg-volt/15"><Camera className="h-3.5 w-3.5 text-volt-2" /></span><span>Meal Scanner<small className="mt-0.5 block text-[9px] font-normal text-white">Open instant macro scan</small></span></button><button type="button" onClick={() => setCoachOpen(true)} className="group flex w-full items-center gap-2.5 rounded-xl border border-volt/35 bg-volt/[0.08] px-2.5 py-2.5 text-left text-xs font-semibold text-white"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-volt/45 bg-volt/15"><Bot className="h-3.5 w-3.5 text-volt-2" /></span><span>Live AI Coach<small className="mt-0.5 block text-[9px] font-normal text-white">Mock real-time track guidance</small></span></button><button type="button" onClick={onNewFlow} className="group flex w-full items-center gap-2.5 rounded-xl border border-volt/35 bg-volt/[0.08] px-2.5 py-2.5 text-left text-xs font-semibold text-white"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-volt/45 bg-volt/15"><RefreshCcw className="h-3.5 w-3.5 text-volt-2" /></span><span>Start New Monthly Flow<small className="mt-0.5 block text-[9px] font-normal text-white">Refresh your 30-day plan</small></span></button></nav><div className="mt-3 shrink-0 rounded-2xl border border-white/15 bg-white/[0.03] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-white"><span className="grid h-7 w-7 place-items-center rounded-full border border-volt/50 bg-volt/25 text-white">{(state.user?.name ?? 'Proteus').slice(0, 1)}</span><span className="truncate">{state.user?.name ?? 'Proteus user'}</span></div><p className="mt-1 text-[10px] leading-tight text-white">Account, plan, and billing live in Settings.</p><button type="button" onClick={() => signOut().then(() => navigate({ to: '/' }))} className="mt-2 rounded-lg border border-white/15 bg-white/[0.04] p-1.5 text-white" aria-label="Sign out"><LogOut className="h-3.5 w-3.5" /></button></div></aside>{mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-[#020611]/75 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}<div className="relative z-10 ml-0 flex h-dvh min-w-0 flex-col md:ml-72"><header className="flex items-center justify-between border-b border-volt/20 bg-[#070C18]/90 px-4 py-3 md:hidden"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-volt/45 p-2 text-volt-2" aria-label="Open navigation"><Menu className="h-5 w-5" /></button><span className="text-xs font-bold uppercase tracking-[0.16em] text-volt-2">{track.name} workspace</span><button type="button" onClick={() => setScannerOpen(true)} className="rounded-xl border border-white/15 p-2 text-white" aria-label="Open meal scanner"><Camera className="h-5 w-5" /></button></header><main className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-8 sm:py-6">{pathname !== '/app/plan' && <div className="mb-2"><Link to="/app/plan" className="seg inline-flex items-center gap-1.5 text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard</Link></div>}<TrialGate user={state.user!}><Outlet /></TrialGate></main><LegalFooter /></div>{scannerOpen && <Scanner pathwayId={normalizePathway(state.profile?.pathwayId) ?? 'general'} track={track.name} onClose={() => setScannerOpen(false)} />} {coachOpen && <CoachPanel pathwayId={normalizePathway(state.profile?.pathwayId) ?? 'general'} track={track.name} onClose={() => setCoachOpen(false)} />}</div>
}

function Scanner({ pathwayId, track, onClose }: { pathwayId: PathwayId; track: string; onClose: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ReturnType<typeof mockMealResponse> | null>(null)
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#050a16]/80 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="meal-scanner-title"><section className="w-full max-w-xl rounded-3xl border border-volt/60 bg-[#0b1733] p-6 shadow-[0_0_70px_rgba(61,139,255,.45)]"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-volt-2">{track} pathway tool</p><h2 id="meal-scanner-title" className="glow-title mt-2 font-display text-3xl font-bold text-white">Meal Scanner</h2><p className="mt-2 text-white">Upload a meal photo for a real-time mock macro estimate.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-white/15 p-2 text-white" aria-label="Close meal scanner"><X className="h-5 w-5" /></button></div><label className="mt-6 flex min-h-40 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-volt/60 bg-volt/[0.08] p-5 text-center">{preview ? <img src={preview} alt="Meal preview" className="max-h-36 rounded-xl object-cover" /> : <span><FileImage className="mx-auto h-10 w-10 text-volt-2" /><span className="mt-2 block font-semibold text-white">Choose photo or use camera</span></span>}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setPreview(URL.createObjectURL(file)); setResult(mockMealResponse(pathwayId, file.name)) } }} /></label>{result && <><div className="mt-5 grid grid-cols-4 gap-2">{[['Calories', result.calories], ['Protein', `${result.protein} g`], ['Carbs', `${result.carbs} g`], ['Sugars', `${result.sugars} g`]].map(([label, value]) => <div key={label} className="rounded-xl border border-volt/35 bg-volt/10 p-3 text-center"><strong className="glow-text block text-lg">{value}</strong><span className="mt-1 block text-[10px] text-white">{label}</span></div>)}</div><div className="mt-4 rounded-xl border border-volt/30 bg-volt/[0.08] p-3 text-sm text-white">{result.nextStep}</div><button type="button" className="btn-glow btn-sm mt-4" onClick={() => { actions.addMealScan({ calories: result.calories, protein: result.protein, carbs: result.carbs, sugars: result.sugars, summary: result.summary }); onClose() }}>Add mock scan to today&apos;s log</button></>}<p className="mt-5 text-xs text-white">Mock coaching response for preview — educational estimate only, not medical advice.</p></section></div>
}

function CoachPanel({ pathwayId, track, onClose }: { pathwayId: PathwayId; track: string; onClose: () => void }) {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState(() => mockCoachResponse(pathwayId, ''))
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#050a16]/80 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="coach-title"><section className="w-full max-w-xl rounded-3xl border border-volt/60 bg-[#0b1733] p-6 shadow-[0_0_70px_rgba(61,139,255,.45)]"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-volt-2">{track} live track coaching</p><h2 id="coach-title" className="glow-title mt-2 font-display text-3xl font-bold text-white">AI Coach</h2></div><button type="button" onClick={onClose} className="rounded-lg border border-white/15 p-2 text-white" aria-label="Close AI Coach"><X className="h-5 w-5" /></button></div><div className="mt-6 rounded-2xl border border-volt/30 bg-volt/[0.08] p-4 text-sm leading-relaxed text-white"><Bot className="mb-2 h-5 w-5 text-volt-2" />{response}</div><label className="mt-5 block"><span className="mb-2 block text-sm font-semibold text-white">Ask for a next-step cue</span><input className="field" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setResponse(mockCoachResponse(pathwayId, prompt)) }} placeholder="What should I focus on next?" /></label><div className="mt-4 flex justify-between gap-3"><Link to="/app/support" onClick={onClose} className="seg">Open full AI Coach</Link><button type="button" className="btn-glow btn-sm" onClick={() => setResponse(mockCoachResponse(pathwayId, prompt))}>Get mock response <ArrowRight className="h-4 w-4" /></button></div><p className="mt-5 text-xs text-white">Preview response only — coaching support, not medical advice.</p></section></div>
}
