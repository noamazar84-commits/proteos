import { actions, type User } from './store'

interface GoogleSignInConfig {
  clientId: string
  nonce: string
}

async function responseError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown }
  return new Error(typeof body.error === 'string' ? body.error : `Request failed (${response.status})`)
}

export async function getGoogleSignInConfig(): Promise<GoogleSignInConfig> {
  const response = await fetch('/api/auth/google', { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw await responseError(response)
  return (await response.json()) as GoogleSignInConfig
}

export async function loadCurrentSession(): Promise<User | null> {
  if (import.meta.env.DEV) {
    actions.setSession(DEVELOPMENT_USER)
    return DEVELOPMENT_USER
  }
  const response = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
  if (response.status === 401) return null
  if (!response.ok) throw await responseError(response)
  const body = (await response.json()) as { user?: User | null }
  return body.user ?? null
}

export async function signInWithGoogleCredential(credential: string, consentAccepted = false, adultConfirmed = false): Promise<User> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credential, consentAccepted, adultConfirmed }),
  })
  if (!response.ok) throw await responseError(response)
  const body = (await response.json()) as { user: User }
  actions.setSession(body.user)
  return body.user
}

export async function signInWithDevelopmentAdmin(): Promise<User> {
  try {
    const response = await fetch('/api/auth/dev', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (!response.ok) {
      if (!import.meta.env.DEV) throw await responseError(response)
      setLocalDevelopmentSession(true)
      actions.setSession(DEVELOPMENT_USER)
      return DEVELOPMENT_USER
    }
    const body = (await response.json()) as { user: User }
    setLocalDevelopmentSession(true)
    actions.setSession(body.user)
    return body.user
  } catch (cause) {
    if (!import.meta.env.DEV) throw cause
    setLocalDevelopmentSession(true)
    actions.setSession(DEVELOPMENT_USER)
    return DEVELOPMENT_USER
  }
}

export async function signInWithPassword(input: { mode: 'signup' | 'login'; email: string; password: string; name?: string; consentAccepted?: boolean; adultConfirmed?: boolean }): Promise<User> {
  const response = await fetch('/api/auth/password', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = (await response.json().catch(() => ({}))) as { user?: User; message?: string; verificationRequired?: boolean; error?: string }
  if (!response.ok || response.status === 202) throw new Error(body.message ?? body.error ?? 'Please verify your email before signing in.')
  if (!body.user) throw new Error('Your account could not be signed in. Please try again.')
  actions.setSession(body.user)
  return body.user
}

export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' })
  } finally {
    setLocalDevelopmentSession(false)
    actions.signOut()
  }
}

const DEVELOPMENT_USER: User = {
  id: -1,
  email: 'noamazar84@gmail.com',
  emailVerified: true,
  name: 'Noam Azar',
  provider: 'google',
  pictureUrl: null,
  pathway: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function setLocalDevelopmentSession(active: boolean): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  if (active) window.sessionStorage.setItem('proteus:dev-session', '1')
  else window.sessionStorage.removeItem('proteus:dev-session')
}
