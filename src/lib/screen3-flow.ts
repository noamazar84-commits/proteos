import type { AppState } from './store'
import type { PathwayId } from './fixtures'

export type Screen3State = 'landing' | 'pathway_select' | 'welcome_screen' | 'setup_wizard' | 'active_dashboard'
export type FlowEvent = 'LANDING_CONTINUE' | 'SELECT_PATHWAY' | 'START_PLAN' | 'COMPLETE_WIZARD' | 'RESET_MONTH'

export const EMPTY_APP_STATE: AppState = {
  user: null,
  profile: null,
  months: [],
  checkIns: [],
  completed: {},
  protein: { perKg: 1.6, appetite: 'moderate', mealsPerDay: 4, selections: {} },
  dietaryPreference: null,
  mealScans: [],
}

export function normalizePathway(value: unknown): PathwayId | null {
  return value === 'glp1' || value === 'bariatric' || value === 'general' ? value : null
}

export function shouldRenderSidebar(input: { hydrated: boolean; hasUser: boolean; hasProfile: boolean; onboarding: boolean }): boolean {
  return input.hydrated && input.hasUser && input.hasProfile && !input.onboarding
}

export function safeAppState(value: AppState | null | undefined): AppState {
  if (!value || typeof value !== 'object') return EMPTY_APP_STATE
  return {
    ...EMPTY_APP_STATE,
    ...value,
    user: value.user ?? null,
    profile: value.profile ?? null,
    months: Array.isArray(value.months) ? value.months : [],
    checkIns: Array.isArray(value.checkIns) ? value.checkIns : [],
    completed: value.completed ?? {},
    protein: { ...EMPTY_APP_STATE.protein, ...(value.protein ?? {}) },
    mealScans: Array.isArray(value.mealScans) ? value.mealScans : [],
  }
}

export function transitionScreen3(current: Screen3State | null | undefined, event: FlowEvent): Screen3State {
  const state = current ?? 'landing'
  if (event === 'LANDING_CONTINUE') return 'pathway_select'
  if (event === 'SELECT_PATHWAY') return 'welcome_screen'
  if (event === 'START_PLAN') return 'setup_wizard'
  if (event === 'COMPLETE_WIZARD') return 'active_dashboard'
  if (event === 'RESET_MONTH') return 'welcome_screen'
  return state
}

export type MockMealResponse = { calories: number; protein: number; carbs: number; sugars: number; summary: string; nextStep: string }
export function mockMealResponse(pathway: PathwayId, fileName = 'meal-photo.jpg'): MockMealResponse {
  const profile = pathway === 'glp1' ? { calories: 390, protein: 34, carbs: 28, sugars: 7, focus: 'protein anchor and hydration' } : pathway === 'bariatric' ? { calories: 310, protein: 29, carbs: 20, sugars: 5, focus: 'small volume and mindful pacing' } : { calories: 430, protein: 31, carbs: 42, sugars: 8, focus: 'whole-food balance and consistency' }
  return { calories: profile.calories, protein: profile.protein, carbs: profile.carbs, sugars: profile.sugars, summary: `${fileName} matched to the ${pathway} coaching track.`, nextStep: `Coach cue: keep ${profile.focus} in view for your next meal.` }
}

export function mockCoachResponse(pathway: PathwayId, prompt: string): string {
  const focus = pathway === 'glp1' ? 'a gentle protein anchor and a glass of water' : pathway === 'bariatric' ? 'a small, protein-first portion and mindful pacing' : 'one whole-food choice and a repeatable next step'
  const cleaned = prompt.trim()
  return cleaned ? `For your ${pathway} track: start with ${focus}. You asked “${cleaned}” — make the next action small enough to complete in the next 10 minutes.` : `For your ${pathway} track: start with ${focus}. What is the next meal, movement, or routine cue you want to make easier today?`
}
