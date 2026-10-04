import assert from 'node:assert/strict'
import test from 'node:test'
import { EMPTY_APP_STATE, mockCoachResponse, mockMealResponse, safeAppState, shouldRenderSidebar, transitionScreen3 } from '../src/lib/screen3-flow.ts'

test('the complete onboarding state machine advances without null-pointer failures', () => {
  let state = transitionScreen3(undefined, 'LANDING_CONTINUE')
  assert.equal(state, 'pathway_select')
  state = transitionScreen3(state, 'SELECT_PATHWAY')
  assert.equal(state, 'welcome_screen')
  state = transitionScreen3(state, 'START_PLAN')
  assert.equal(state, 'setup_wizard')
  state = transitionScreen3(state, 'COMPLETE_WIZARD')
  assert.equal(state, 'active_dashboard')
  assert.doesNotThrow(() => safeAppState(undefined))
  assert.doesNotThrow(() => safeAppState(null))
})

test('pathway selection and monthly reset return to safe welcome state', () => {
  assert.equal(transitionScreen3('pathway_select', 'SELECT_PATHWAY'), 'welcome_screen')
  assert.equal(transitionScreen3('active_dashboard', 'RESET_MONTH'), 'welcome_screen')
  assert.equal(transitionScreen3(null, 'RESET_MONTH'), 'welcome_screen')
})

test('sidebar is hidden until hydration, user, profile, and onboarding completion are all ready', () => {
  assert.equal(shouldRenderSidebar({ hydrated: false, hasUser: true, hasProfile: true, onboarding: false }), false)
  assert.equal(shouldRenderSidebar({ hydrated: true, hasUser: false, hasProfile: true, onboarding: false }), false)
  assert.equal(shouldRenderSidebar({ hydrated: true, hasUser: true, hasProfile: false, onboarding: true }), false)
  assert.equal(shouldRenderSidebar({ hydrated: true, hasUser: true, hasProfile: true, onboarding: true }), false)
  assert.equal(shouldRenderSidebar({ hydrated: true, hasUser: true, hasProfile: true, onboarding: false }), true)
})

test('safeAppState repairs missing nullable and collection fields', () => {
  const repaired = safeAppState({ ...EMPTY_APP_STATE, user: undefined as never, profile: undefined as never, months: undefined as never, completed: undefined as never, protein: undefined as never, mealScans: undefined as never })
  assert.equal(repaired.user, null)
  assert.equal(repaired.profile, null)
  assert.deepEqual(repaired.months, [])
  assert.deepEqual(repaired.completed, {})
  assert.equal(repaired.protein.perKg, 1.6)
  assert.deepEqual(repaired.mealScans, [])
})

test('mock meal scanner responses are track-aware and complete', () => {
  for (const pathway of ['glp1', 'bariatric', 'general'] as const) {
    const result = mockMealResponse(pathway, 'lunch.png')
    assert.ok(result.summary.includes(pathway))
    assert.ok(result.nextStep.startsWith('Coach cue:'))
    assert.ok(result.protein > 0)
  }
})

test('mock AI coach responds with an actionable track-specific cue', () => {
  const answer = mockCoachResponse('bariatric', 'What should I do next?')
  assert.match(answer, /bariatric/)
  assert.match(answer, /next 10 minutes/)
  assert.doesNotThrow(() => mockCoachResponse('general', ''))
})
