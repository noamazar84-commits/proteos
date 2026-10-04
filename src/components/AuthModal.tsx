import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Eye, EyeOff, X } from 'lucide-react'
import { getGoogleSignInConfig, signInWithDevelopmentAdmin, signInWithGoogleCredential, signInWithPassword, signOut } from '@/lib/auth'
import type { User } from '@/lib/store'
import { useAppState } from '@/lib/store'
import { integrations } from '@/lib/integrations'
import { Logo } from './Logo'

type GoogleCredentialResponse = { credential?: string }
type GoogleButtonOptions = {
  type: 'standard'
  theme: 'outline'
  size: 'large'
  text: 'signin_with' | 'signup_with'
  shape: 'pill'
  logo_alignment: 'left'
  width: number
}
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            nonce: string
            callback: (response: GoogleCredentialResponse) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
        }
      }
    }
  }
}

let googleScript: Promise<void> | null = null
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleScript) return googleScript
  googleScript = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-identity-services') as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.id = 'google-identity-services'
    script.onload = () => resolve()
    script.onerror = () => {
      googleScript = null
      reject(new Error('Google Sign-In could not load. Please check your connection and try again.'))
    }
    if (!existing) document.head.appendChild(script)
  })
  return googleScript
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.57-5.17 3.57-8.64Z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-3A7.2 7.2 0 0 1 12 19.2a7.27 7.27 0 0 1-6.83-5.03H1.17v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.17 14.17a7.25 7.25 0 0 1 0-4.34v-3.1H1.17a12 12 0 0 0 0 10.54l4-3.1Z"/><path fill="#EA4335" d="M12 4.8a6.6 6.6 0 0 1 4.66 1.82l3.49-3.49A11.98 11.98 0 0 0 1.17 6.73l4 3.1A7.27 7.27 0 0 1 12 4.8Z"/></svg>
}

export function AuthModal({
  open,
  onClose,
  initialMode = 'signup',
  continueTo,
  forceLogin = false,
}: {
  open: boolean
  onClose: () => void
  initialMode?: 'signup' | 'login'
  continueTo?: '/admin'
  forceLogin?: boolean
}) {
  const navigate = useNavigate()
  const state = useAppState()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailFields, setShowEmailFields] = useState(true)
  const [googleSelected, setGoogleSelected] = useState(forceLogin)
  const [consent, setConsent] = useState(false)
  const [adultConfirmed, setAdultConfirmed] = useState(false)

  useEffect(() => {
    if (!open) return
    setShowEmailFields(true)
    setGoogleSelected(forceLogin)
    setConsent(false)
    setAdultConfirmed(false)
    setError(null)
    setEmail('')
    setPassword('')
    setShowPassword(false)
  }, [open, initialMode, forceLogin])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || (state.user && !forceLogin) || (!forceLogin && !googleSelected)) return
    let cancelled = false
    setError(null)
    setBusy(true)

    getGoogleSignInConfig()
      .then(async ({ clientId, nonce }) => {
        await loadGoogleScript()
        if (cancelled || !buttonRef.current || !window.google?.accounts.id) return
        const container = buttonRef.current
        container.replaceChildren()
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (credentialResponse) => {
            if (initialMode === 'signup' && (!consent || !adultConfirmed)) {
              setBusy(false)
              setError('Confirm that you are 18 or over and agree to the Terms of Use, Privacy Policy, and No-Refund Policy before creating your account.')
              return
            }
            if (!credentialResponse.credential) {
              setBusy(false)
              setError('Google did not return a sign-in credential. Please try again.')
              return
            }
            setBusy(true)
            setError(null)
            try {
              const user = await signInWithGoogleCredential(credentialResponse.credential, initialMode !== 'signup' || consent, initialMode !== 'signup' || adultConfirmed)
              setBusy(false)
              onClose()
              navigate({ to: continueTo ?? (user.pathway ? '/app/plan' : '/app') })
            } catch (cause) {
              setBusy(false)
              setError(cause instanceof Error ? cause.message : 'Google sign-in failed. Please try again.')
            }
          },
        })
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: initialMode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: Math.max(240, Math.min(360, Math.floor(container.clientWidth || 360))),
        })
        setBusy(false)
      })
      .catch((cause) => {
        if (!cancelled) {
          setBusy(false)
          setError(cause instanceof Error ? cause.message : 'Google Sign-In is not available right now.')
        }
      })

    return () => {
      cancelled = true
      buttonRef.current?.replaceChildren()
    }
  }, [open, state.user?.id, forceLogin, googleSelected, consent, adultConfirmed, initialMode, continueTo, navigate, onClose])

  if (!open) return null

  const proceed = (user: User | null) => {
    onClose()
    navigate({ to: continueTo ?? (user?.pathway || state.profile ? '/app/plan' : '/app') })
  }

  const submitPasswordAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (initialMode === 'signup' && (!consent || !adultConfirmed)) {
      setError('Confirm that you are 18 or over and agree to the Terms of Use, Privacy Policy, and No-Refund Policy before creating your account.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const user = await signInWithPassword({ mode: initialMode, email, password, consentAccepted: initialMode !== 'signup' || consent, adultConfirmed: initialMode !== 'signup' || adultConfirmed })
      setPassword('')
      setBusy(false)
      proceed(user)
    } catch (cause) {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : 'Email sign-in failed. Please try again.')
    }
  }

  const continueInDevelopment = async () => {
    setBusy(true)
    setError(null)
    try {
      const user = await signInWithDevelopmentAdmin()
      setBusy(false)
      onClose()
      navigate({ to: user.pathway ? '/app/plan' : '/app' })
    } catch (cause) {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : 'Development dashboard access is unavailable.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-[#050811]/80 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-8"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div className="panel rise relative my-auto w-full max-w-[26rem] p-5 text-center shadow-[0_0_80px_rgba(61,139,255,0.25)] sm:p-7">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="flex justify-center"><Logo size="sm" /></div>

        {state.user && !forceLogin ? (
          <>
            <h2 id="auth-title" className="glow-title font-display mt-4 text-2xl font-extrabold sm:text-3xl">Welcome back</h2>
            <p className="mt-2 text-sm text-white/70">You’re signed in as <strong className="text-white">{state.user.email}</strong>.</p>
            <button onClick={() => proceed(state.user)} className="btn-glow btn-sm mt-7 w-full">Continue to Proteus</button>
            <button onClick={() => void signOut()} className="mt-4 text-sm font-semibold text-volt-2 hover:text-white">Use a different account</button>
          </>
        ) : (
          <>
            <h2 id="auth-title" className="glow-title font-display mt-4 text-2xl font-extrabold sm:text-3xl">{initialMode === 'signup' ? 'Start your 7-day trial' : 'Sign in to Proteus'}</h2>
            <p className="mt-2 text-sm text-white/70">
              {initialMode === 'signup' ? 'Create your account, then choose your pathway. Your free trial starts when Whop confirms your membership.' : 'Continue securely with the account linked to your Proteus plan.'}
            </p>

            <div className="mt-6 space-y-3" aria-busy={busy}>
              {!forceLogin && (
                googleSelected
                  ? <div className="min-h-12 w-full" ref={buttonRef} />
                  : <button type="button" disabled={busy} onClick={() => { if (import.meta.env.DEV) void continueInDevelopment(); else { setGoogleSelected(true); setError(null) } }} className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white px-5 py-3.5 text-sm font-bold text-[#0A0F1D] shadow-[0_8px_25px_rgba(255,255,255,0.18)] disabled:cursor-wait disabled:opacity-60">{import.meta.env.DEV ? (busy ? 'Opening development dashboard…' : 'Continue in development') : <><GoogleIcon />{initialMode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</>}</button>
              )}
              {forceLogin && <div className="min-h-12 w-full" ref={buttonRef} />}
            </div>
            {busy && <p className="mt-3 text-xs text-white/50" role="status" aria-live="polite">Connecting securely…</p>}

            {showEmailFields && !forceLogin && (
              <form onSubmit={submitPasswordAuth} className="mt-4 space-y-3 text-left">
                <label className="block"><span className="sr-only">Email address</span><input className="field" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label className="relative block"><span className="sr-only">Password</span><input className="field pr-12" type={showPassword ? 'text' : 'password'} autoComplete={initialMode === 'signup' ? 'new-password' : 'current-password'} placeholder="Password (8+ characters)" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="absolute right-2 top-2.5 rounded-lg p-2 text-white/50 hover:text-white" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></label>
                {initialMode === 'signup' && <>
                  <label className="flex items-start gap-2 text-left text-xs leading-relaxed text-white/60"><input type="checkbox" className="mt-0.5 accent-[#3d8bff]" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} required /><span>I confirm I am 18 or older. Proteus is not available to children or teens.</span></label>
                  <label className="flex items-start gap-2 text-left text-xs leading-relaxed text-white/60"><input type="checkbox" className="mt-0.5 accent-[#3d8bff]" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>I agree to the <Link className="font-semibold text-volt-2 hover:text-white" to="/terms">Terms of Use</Link> (including its refund terms) and <Link className="font-semibold text-volt-2 hover:text-white" to="/privacy">Privacy Policy</Link>.</span></label>
                </>}
                <button type="submit" className="btn-glow btn-sm w-full" disabled={busy || (initialMode === 'signup' && (!consent || !adultConfirmed))}>{busy ? 'Please wait…' : initialMode === 'signup' ? 'Create account' : 'Sign in'}</button>
              </form>
            )}
            {forceLogin && <p className="mt-4 text-xs text-white/40">Your verified Google email is used for your subscription and account access.</p>}
            {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2.5 text-left text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
            {initialMode === 'signup' && <p className="mt-3 text-[11px] text-white/45">7 days free • {integrations.pricing.label}/month after • cancel anytime</p>}
          </>
        )}
      </div>
    </div>
  )
}
