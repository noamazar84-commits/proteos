/**
 * Adaptive plan engine. Pure functions: given a profile (and, after month one,
 * the previous month + a check-in) it produces the next 30-day plan.
 * Month N+1 is always derived from month N, so the program can run indefinitely.
 */
import { getPathway, type PathwayId } from './fixtures'

export type Activity = 'low' | 'moderate' | 'high'
export type DietaryPreference = 'whole_food' | 'flexible_80_20'

export interface Profile {
  pathwayId: PathwayId
  dietaryPreference?: DietaryPreference
  weightKg: number
  goalWeightKg: number
  activity: Activity
  startingStatus?: string
  milestone?: string
  dailySteps?: number
  startDate: string
}

export interface Adjustments {
  calorieShift: number
  proteinPerKg: number
  /** -2..+2 training volume modifier */
  volume: number
  trainingDays: number
  mode: 'progress' | 'maintain'
}

export type SessionType = 'Strength' | 'Hypertrophy' | 'Conditioning' | 'Mobility' | 'Recovery' | 'Rest'

export interface PlanDay {
  day: number
  type: SessionType
  title: string
  blocks: string[]
  minutes: number
  habit: string
}

export interface MonthPlan {
  monthIndex: number
  phase: string
  startDate: string
  startWeightKg: number
  projectedWeightKg: number
  proteinTarget: number
  calories: number
  adjustments: Adjustments
  days: PlanDay[]
  notes: string[]
}

export interface CheckIn {
  monthIndex: number
  date: string
  weightKg: number
  energy: number
  adherence: number
  difficulty: 'easy' | 'right' | 'hard'
  hunger: 'low' | 'ok' | 'high'
  waistCm?: number
  goalWeightKg?: number
  medicationChanges?: string
  sideEffects?: string
  notes: string
}

const ACTIVITY_FACTOR: Record<Activity, number> = { low: 1.35, moderate: 1.5, high: 1.65 }
const DAY_MS = 86_400_000

export const maintenanceCalories = (weightKg: number, activity: Activity) =>
  weightKg * 22 * ACTIVITY_FACTOR[activity]

/**
 * Round to a step (0.1 kg, 10 kcal, 5 g …) without leaving float noise behind.
 * Math.round(89.6 / 0.1) * 0.1 evaluates to 89.60000000000001, which used to
 * surface on the dashboard as "89.60000000000001 kg".
 */
const round = (n: number, step = 1) => {
  const decimals = Math.max(0, Math.min(10, -Math.floor(Math.log10(step))))
  return Number((Math.round(n / step) * step).toFixed(decimals))
}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const TRAINING_SEQUENCE: Record<PathwayId, SessionType[]> = {
  glp1: ['Strength', 'Conditioning', 'Strength', 'Hypertrophy', 'Strength', 'Conditioning'],
  bariatric: ['Conditioning', 'Strength', 'Conditioning', 'Strength', 'Conditioning', 'Strength'],
  general: ['Strength', 'Conditioning', 'Hypertrophy', 'Conditioning', 'Strength', 'Conditioning'],
}

const PHASES: Record<PathwayId, string[]> = {
  glp1: ['Titration', 'Protein Pacing', 'Muscle Protect', 'Momentum', 'Consolidate'],
  bariatric: ['Recovery & Protein', 'Portion Training', 'Texture Progression', 'Active Adaptation', 'Consolidate'],
  general: ['Foundation', 'Build', 'Intensify', 'Metabolic Reset', 'Consolidate'],
}

const WEEKDAY_SLOTS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
}

const LIBRARY: Record<'Strength' | 'Hypertrophy' | 'Conditioning', { title: string; moves: string[] }[]> = {
  Strength: [
    { title: 'Lower body strength', moves: ['Back squat', 'Romanian deadlift', 'Walking lunge'] },
    { title: 'Upper body strength', moves: ['Bench press', 'Weighted pull-up', 'Overhead press'] },
    { title: 'Posterior chain power', moves: ['Trap-bar deadlift', 'Hip thrust', 'Single-arm row'] },
    { title: 'Full-body strength', moves: ['Front squat', 'Incline press', 'Chest-supported row'] },
    { title: 'Press & hinge', moves: ['Push press', 'Conventional deadlift', 'Dips'] },
  ],
  Hypertrophy: [
    { title: 'Push hypertrophy', moves: ['Incline DB press', 'Cable fly', 'Lateral raise', 'Rope pushdown'] },
    { title: 'Pull hypertrophy', moves: ['Lat pulldown', 'Seated cable row', 'Rear-delt fly', 'Hammer curl'] },
    { title: 'Leg hypertrophy', moves: ['Leg press', 'Bulgarian split squat', 'Leg curl', 'Calf raise'] },
    { title: 'Upper pump', moves: ['Machine chest press', 'Pendlay row', 'Arnold press', 'EZ-bar curl'] },
    { title: 'Glutes & hamstrings', moves: ['Hip thrust', 'Nordic curl', 'Cable kickback', 'Back extension'] },
  ],
  Conditioning: [
    { title: 'Metabolic intervals', moves: ['Assault bike', 'Kettlebell swing', 'Burpee'] },
    { title: 'Row & carry circuit', moves: ['Rower', "Farmer's carry", 'Goblet squat'] },
    { title: 'Sled & sprint finisher', moves: ['Sled push', 'Hill sprint', 'Mountain climber'] },
    { title: 'Zone 2 engine', moves: ['Incline walk', 'Easy cycle', 'Nasal breathing'] },
  ],
}

const HABITS = [
  'Hit 25 g+ protein within an hour of waking',
  'Drink 2.5 L of water before 6 pm',
  '8,000+ steps today',
  'Lights out 30 minutes earlier',
  'Prep tomorrow’s lunch tonight',
  'Protein in every meal, no exceptions',
  '10-minute walk after your biggest meal',
  'Log every bite today, honestly',
  'Two fist-sized servings of vegetables',
  'No screens for the first 20 minutes of the day',
  'Take progress photos in the same light',
  'Swap one snack for a protein shake',
]

function phaseFor(pathwayId: PathwayId, monthIndex: number, mode: Adjustments['mode']) {
  if (mode === 'maintain') return 'Maintain & Refine'
  const names = PHASES[pathwayId]
  if (monthIndex > 0 && monthIndex % 4 === 3) return names[4]
  if (monthIndex < 3) return names[monthIndex]
  return names[3]
}

function buildDays(pathwayId: PathwayId, monthIndex: number, adj: Adjustments): PlanDay[] {
  const slots = WEEKDAY_SLOTS[clamp(adj.trainingDays, 3, 6)]
  const sequence = TRAINING_SEQUENCE[pathwayId]
  const consolidate = monthIndex > 0 && monthIndex % 4 === 3
  const baseLevel = Math.min(4, Math.floor(monthIndex / 2)) + adj.volume
  const days: PlanDay[] = []
  let session = 0

  for (let d = 1; d <= 30; d++) {
    const week = Math.floor((d - 1) / 7)
    const weekday = (d - 1) % 7
    const wave = consolidate ? -1 : [0, 1, 2, -1, 0][week]
    const level = clamp(baseLevel + wave, -2, 6)
    const habit = HABITS[(d * 7 + monthIndex * 5) % HABITS.length]
    const slotIdx = slots.indexOf(weekday)

    if (slotIdx === -1) {
      const type: SessionType = weekday === 6 ? 'Rest' : weekday % 2 === 0 ? 'Mobility' : 'Recovery'
      days.push({
        day: d,
        type,
        title: type === 'Rest' ? 'Full rest' : type === 'Mobility' ? 'Mobility flow' : 'Active recovery',
        blocks:
          type === 'Rest'
            ? ['Sleep 8 hours', 'Keep protein at target', 'Light walk if you feel like it']
            : type === 'Mobility'
              ? ['Hip 90/90 — 3×60s', 'Thoracic openers — 2×10', 'Deep squat hold — 3×45s']
              : ['Zone 2 walk — 30 min', 'Foam roll — 10 min', 'Breathing reset — 5 min'],
        minutes: type === 'Rest' ? 0 : type === 'Mobility' ? 20 : 40,
        habit,
      })
      continue
    }

    const type = sequence[slotIdx % sequence.length] as 'Strength' | 'Hypertrophy' | 'Conditioning'
    const pool = LIBRARY[type]
    const template = pool[(session + monthIndex * 2) % pool.length]
    session++

    let blocks: string[]
    let minutes: number
    if (type === 'Strength') {
      const sets = clamp(3 + Math.floor(level / 2), 2, 6)
      const reps = [8, 6, 5, 4, 3][clamp(week + Math.floor(monthIndex / 3), 0, 4)]
      blocks = template.moves.map((m, i) => (i === 0 ? `${m} — ${sets + 1}×${reps}` : `${m} — ${sets}×${reps + 2}`))
      minutes = 45 + sets * 5
    } else if (type === 'Hypertrophy') {
      const sets = clamp(3 + Math.floor((level + 1) / 2), 2, 5)
      blocks = template.moves.map((m, i) => `${m} — ${sets}×${i < 2 ? '8–10' : '12–15'}`)
      minutes = 50 + sets * 4
    } else {
      const rounds = clamp(4 + level, 3, 10)
      blocks =
        template.title === 'Zone 2 engine'
          ? template.moves.map((m) => `${m} — ${25 + level * 5} min steady`)
          : template.moves.map((m) => `${m} — ${rounds} rounds · 40s on / 20s off`)
      minutes = 25 + rounds * 3
    }

    days.push({ day: d, type, title: template.title, blocks, minutes, habit })
  }
  return days
}

export function buildMonth(
  profile: Profile,
  monthIndex: number,
  weightKg: number,
  adj: Adjustments,
  notes: string[],
  startDate: string,
): MonthPlan {
  const tdee = maintenanceCalories(weightKg, profile.activity)
  const shift = adj.mode === 'maintain' ? 0 : adj.calorieShift
  const calories = round(tdee * (1 + shift), 10)
  const projected = weightKg + (tdee * shift * 30) / 7700
  return {
    monthIndex,
    phase: phaseFor(profile.pathwayId, monthIndex, adj.mode),
    startDate,
    startWeightKg: round(weightKg, 0.1),
    projectedWeightKg: round(projected, 0.1),
    proteinTarget: Math.max(
      getPathway(profile.pathwayId).proteinFloor,
      round(Math.min(weightKg, profile.goalWeightKg * 1.15) * adj.proteinPerKg, 5),
    ),
    calories,
    adjustments: adj,
    days: buildDays(profile.pathwayId, monthIndex, adj),
    notes,
  }
}

const INTRO_NOTES: Record<PathwayId, string[]> = {
  glp1: [
    'Strength training 3×/week to protect muscle — up to 40% of GLP-1 weight loss can be lean mass without it.',
    'Meals are small and protein-dense so you can hit your target even on low-appetite days.',
  ],
  bariatric: [
    'Movement starts gentle — walking and light resistance — and progresses each month as you heal.',
    'Five small meals a day, ½–1 cup each, with protein eaten first.',
  ],
  general: [
    'A 20% deficit targets roughly 0.5 kg of fat loss per week without crashing your energy.',
    'Weeks 1–3 ramp up, week 4 eases off so you finish the month fresh.',
  ],
}

export function generateInitialPlan(profile: Profile): MonthPlan {
  const p = getPathway(profile.pathwayId)
  const adj: Adjustments = {
    calorieShift: p.calorieShift,
    proteinPerKg: p.proteinPerKg,
    volume: clamp(p.baseVolume + (profile.activity === 'low' ? -1 : profile.activity === 'high' ? 1 : 0), -2, 2),
    trainingDays: profile.activity === 'low' ? Math.max(3, p.trainingDays - 1) : p.trainingDays,
    mode: 'progress',
  }
  return buildMonth(
    profile,
    0,
    profile.weightKg,
    adj,
    [
      `Built for the ${p.name} pathway from your starting weight of ${profile.weightKg} kg toward ${profile.goalWeightKg} kg.`,
      `Protein set at ${p.proteinPerKg} g per kg of reference weight, never below a ${p.proteinFloor} g floor.`,
      ...INTRO_NOTES[profile.pathwayId],
    ],
    profile.startDate,
  )
}

/** Derive month N+1 from month N and the user's check-in. */
export function generateNextMonth(
  profile: Profile,
  prev: MonthPlan,
  checkIn: CheckIn,
  proteinPerKgOverride?: number,
): MonthPlan {
  const pathway = profile.pathwayId
  const effectiveProfile = checkIn.goalWeightKg && checkIn.goalWeightKg > 0
    ? { ...profile, goalWeightKg: checkIn.goalWeightKg }
    : profile
  const adj: Adjustments = { ...prev.adjustments }
  if (proteinPerKgOverride) adj.proteinPerKg = proteinPerKgOverride
  const notes: string[] = []

  if (checkIn.medicationChanges?.trim()) notes.push(`Medication update recorded: ${checkIn.medicationChanges.trim()}`)
  if (checkIn.sideEffects?.trim()) notes.push(`Side effects recorded for the next phase: ${checkIn.sideEffects.trim()}`)
  if (checkIn.goalWeightKg && checkIn.goalWeightKg !== profile.goalWeightKg) notes.push(`Goal updated to ${checkIn.goalWeightKg} kg; targets recalculated around the new destination.`)

  const actual = checkIn.weightKg - prev.startWeightKg
  const expected = prev.projectedWeightKg - prev.startWeightKg
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)} kg`
  notes.push(`Last month: ${fmt(actual)} vs. ${fmt(expected)} projected, ${checkIn.adherence}% adherence.`)

  const goalReached = checkIn.weightKg <= effectiveProfile.goalWeightKg

  if (goalReached && adj.mode !== 'maintain') {
    adj.mode = 'maintain'
    notes.push(`Goal weight reached — switching to maintenance calories to lock in your result.`)
  } else if (adj.mode === 'progress' && checkIn.adherence >= 70) {
    // Floor and ceiling of the deficit differ per pathway
    const deepest = pathway === 'bariatric' ? -0.4 : -0.3
    const lightest = pathway === 'bariatric' ? -0.15 : -0.1
    if (actual > expected * 0.5) {
      adj.calorieShift = clamp(adj.calorieShift - 0.05, deepest, lightest)
      notes.push('Weight loss was slower than projected, so the deficit is 5% deeper this month.')
    } else if (actual < expected * 1.5) {
      adj.calorieShift = clamp(adj.calorieShift + 0.05, deepest, lightest)
      notes.push('You lost faster than projected — calories eased up slightly to protect muscle.')
    }
  }

  if (pathway === 'glp1' && checkIn.hunger === 'low') {
    adj.proteinPerKg = clamp(round(adj.proteinPerKg + 0.1, 0.1), 1.2, 2.2)
    notes.push('Appetite is heavily suppressed — protein nudged up with more shakes and soft protein options.')
  }
  if (pathway === 'bariatric') {
    notes.push(
      nextIndexLabel(prev.monthIndex + 1) +
        (checkIn.hunger === 'high'
          ? ' Hunger is returning — portions can grow to about 1 cup, protein stays first.'
          : ' Keep portions at ½–1 cup and continue the 30-minute drinking rule.'),
    )
  }

  if (checkIn.adherence < 60) {
    adj.trainingDays = clamp(adj.trainingDays - 1, 3, 6)
    notes.push('Adherence was below 60% — one fewer training day so the plan fits your real week.')
  } else if (checkIn.adherence >= 90 && checkIn.difficulty !== 'hard' && adj.trainingDays < 6) {
    adj.trainingDays = clamp(adj.trainingDays + 1, 3, 6)
    notes.push('Near-perfect consistency earned you an extra training day.')
  }

  if (checkIn.difficulty === 'hard' || checkIn.energy <= 2) {
    adj.volume = clamp(adj.volume - 1, -2, 2)
    notes.push('Training volume reduced to match your energy and recovery.')
    if (checkIn.energy <= 2 && adj.mode === 'progress') {
      adj.calorieShift = clamp(adj.calorieShift + 0.03, -0.4, -0.1)
    }
  } else if (checkIn.difficulty === 'easy' && checkIn.energy >= 3) {
    adj.volume = clamp(adj.volume + 1, -2, 2)
    notes.push('Last month felt easy — sets and intervals step up.')
  }

  if (checkIn.hunger === 'high') {
    adj.proteinPerKg = clamp(round(adj.proteinPerKg + 0.1, 0.1), 1.2, 2.4)
    notes.push('Hunger was high, so protein goes up and your meal builder favours high-volume meals.')
  }

  const nextIndex = prev.monthIndex + 1
  if (nextIndex % 4 === 3 && adj.mode === 'progress') {
    notes.push('This is a consolidation month: lighter loads so your body can fully adapt.')
  }

  return buildMonth(effectiveProfile, nextIndex, checkIn.weightKg, adj, notes, checkIn.date)
}

function nextIndexLabel(monthIndex: number) {
  return monthIndex < 3 ? `Month ${monthIndex + 1} post-op focus: ${PHASES.bariatric[monthIndex]}.` : `Month ${monthIndex + 1}:`
}

export function dayOfMonth(plan: MonthPlan, now = Date.now()) {
  const elapsed = Math.floor((now - new Date(plan.startDate).getTime()) / DAY_MS)
  return clamp(elapsed + 1, 1, 30)
}
