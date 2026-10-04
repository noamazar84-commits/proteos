import { useSyncExternalStore } from 'react'
import { getPathway, type Appetite } from './fixtures'
import {
  buildMonth,
  generateInitialPlan,
  generateNextMonth,
  dayOfMonth,
  type Activity,
  type CheckIn,
  type DietaryPreference,
  type MonthPlan,
  type Profile,
} from './engine'
import type { PathwayId } from './fixtures'

export interface User {
  id: number
  email: string
  emailVerified: boolean
  name: string
  provider: 'google' | 'password'
  pictureUrl: string | null
  pathway: PathwayId | null
  createdAt: string
}

export interface ProteinSettings {
  perKg: number
  appetite: Appetite
  mealsPerDay: 3 | 4 | 5
  /** slot key (e.g. "breakfast", "snack-1") -> meal id */
  selections: Record<string, string>
}

export interface MealScan {
  date: string
  calories: number
  protein: number
  carbs: number
  sugars: number
  summary: string
}

export interface AppState {
  user: User | null
  profile: Profile | null
  months: MonthPlan[]
  checkIns: CheckIn[]
  /** `${monthIndex}:${day}` -> true */
  completed: Record<string, true>
  protein: ProteinSettings
  dietaryPreference: DietaryPreference | null
  mealScans: MealScan[]
}

const KEY_PREFIX = 'proteus:plan:v3:'
const initialState: AppState = {
  user: null,
  profile: null,
  months: [],
  checkIns: [],
  completed: {},
  protein: { perKg: 1.6, appetite: 'moderate', mealsPerDay: 4, selections: {} },
  dietaryPreference: null,
  mealScans: [],
}

let state: AppState = initialState
let sessionResolved = false
let ownerId: number | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function readPlan(user: User): AppState {
  if (typeof window === 'undefined') return { ...initialState, user }
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${user.id}`)
    if (!raw) return { ...initialState, user }
    const saved = JSON.parse(raw) as Partial<AppState>
    return {
      ...initialState,
      ...saved,
      user,
      protein: { ...initialState.protein, ...(saved.protein ?? {}) },
      completed: saved.completed ?? {},
    }
  } catch {
    return { ...initialState, user }
  }
}

function persistPlan() {
  if (typeof window === 'undefined' || ownerId === null) return
  const { user: _user, ...plan } = state
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${ownerId}`, JSON.stringify(plan))
  } catch {
    /* local storage may be unavailable or full */
  }
}

function setState(update: (current: AppState) => AppState) {
  state = update(state)
  persistPlan()
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppState() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initialState,
  )
}

/** True only after the authoritative application-session endpoint has responded. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => sessionResolved, () => false)
}

export const actions = {
  setSession(user: User | null) {
    if (user) {
      if (ownerId === user.id && state.user?.id === user.id) {
        state = { ...state, user }
      } else {
        ownerId = user.id
        state = readPlan(user)
      }
    } else {
      ownerId = null
      state = initialState
    }
    sessionResolved = true
    notify()
  },
  signOut() {
    ownerId = null
    state = initialState
    sessionResolved = true
    notify()
  },
  setDietaryPreference(preference: DietaryPreference) {
    setState((current) => ({ ...current, dietaryPreference: preference }))
  },
  startPathway(input: { pathwayId: PathwayId; dietaryPreference?: DietaryPreference; weightKg: number; goalWeightKg: number; activity: Activity; startingStatus?: string; milestone?: string; dailySteps?: number }) {
    const profile: Profile = { ...input, startDate: new Date().toISOString() }
    const first = generateInitialPlan(profile)
    setState((current) => ({
      ...current,
      user: current.user ? { ...current.user, pathway: input.pathwayId } : null,
      profile,
      months: [first],
      checkIns: [],
      completed: {},
      protein: (() => {
        const pathway = getPathway(input.pathwayId)
        return { perKg: pathway.proteinPerKg, appetite: pathway.defaultAppetite, mealsPerDay: pathway.defaultMeals, selections: {} }
      })(),
      dietaryPreference: input.dietaryPreference ?? current.dietaryPreference,
    }))
  },
  toggleDay(monthIndex: number, day: number) {
    setState((current) => {
      const key = `${monthIndex}:${day}`
      const completed = { ...current.completed }
      if (completed[key]) delete completed[key]
      else completed[key] = true
      return { ...current, completed }
    })
  },
  setProtein(patch: Partial<ProteinSettings>) {
    setState((current) => ({ ...current, protein: { ...current.protein, ...patch } }))
  },
  submitCheckIn(input: Omit<CheckIn, 'monthIndex' | 'date'>): MonthPlan | null {
    let next: MonthPlan | null = null
    setState((current) => {
      if (!current.profile || current.months.length === 0) return current
      const previous = current.months[current.months.length - 1]
      const checkIn: CheckIn = { ...input, monthIndex: previous.monthIndex, date: new Date().toISOString() }
      next = generateNextMonth(current.profile, previous, checkIn, current.protein.perKg)
      return {
        ...current,
        profile: input.goalWeightKg ? { ...current.profile, goalWeightKg: input.goalWeightKg } : current.profile,
        months: [...current.months, next],
        checkIns: [...current.checkIns, checkIn],
        protein: { ...current.protein, perKg: next.adjustments.proteinPerKg },
      }
    })
    return next
  },
  keepCurrentMonth() {
    notify()
  },
  continueCurrentMonth() {
    setState((current) => {
      if (!current.profile || current.months.length === 0) return current
      const previous = current.months[current.months.length - 1]
      const next = buildMonth(current.profile, previous.monthIndex + 1, previous.projectedWeightKg, previous.adjustments, [`Continued the ${getPathway(current.profile.pathwayId).name} rhythm seamlessly after the 30-day checkpoint.`, 'Targets, meal pacing, and movement progression carried forward from the previous phase.'], new Date().toISOString())
      return { ...current, months: [...current.months, next] }
    })
  },
  addMealScan(scan: Omit<MealScan, 'date'>) {
    setState((current) => ({ ...current, mealScans: [...current.mealScans, { ...scan, date: new Date().toISOString() }] }))
  },
}

export const currentWeight = (state: AppState) =>
  state.checkIns.length ? state.checkIns[state.checkIns.length - 1].weightKg : (state.profile?.weightKg ?? 80)

export const isCheckpointDue = (state: AppState, now = Date.now()) => {
  const latest = state.months[state.months.length - 1]
  if (!state.profile || !latest) return false
  const hasReview = state.checkIns.some((checkIn) => checkIn.monthIndex === latest.monthIndex)
  return !hasReview && dayOfMonth(latest, now) >= 30
}
