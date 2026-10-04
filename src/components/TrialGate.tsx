import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { AlertCircle, Lock, LoaderCircle } from 'lucide-react'
import { integrations, isAdmin } from '@/lib/integrations'
import type { User } from '@/lib/store'

const DAY_MS = 86_400_000

type ServerSubscription = {
  status: 'not_started' | 'trialing' | 'active' | 'past_due' | 'canceled'
  trialStartedAt: string | null
  trialEndsAt: string | null
  renewalDate: string | null
  cancelAtPeriodEnd: boolean
}
type WhopCheckoutConfig = {
  planId: string
  email: string
  environment: 'sandbox' | 'production'
}
type Access =
  | { state: 'checking' }
  | { state: 'confirming' }
  | { state: 'open'; daysLeft: number | null; trialStartedAt: string | null }
  | { state: 'locked'; status: ServerSubscription['status']; checkout: WhopCheckoutConfig | null }
  | { state: 'error'; message: string }

function evaluate(subscription: ServerSubscription): Access {
  const now = Date.now()
  if (subscription.status === 'active') return { state: 'open', daysLeft: null, trialStartedAt: null }

  if (subscription.status === 'trialing' && subscription.trialEndsAt) {
    const end = new Date(subscription.trialEndsAt).getTime()
    if (Number.isFinite(end) && end > now) {
      return {
        state: 'open',
        daysLeft: Math.ceil((end - now) / DAY_MS),
        trialStartedAt: subscription.trialStartedAt,
      }
    }
  }

  if (subscription.status === 'canceled' && subscription.cancelAtPeriodEnd && subscription.renewalDate) {
    const end = new Date(subscription.renewalDate).getTime()
    if (Number.isFinite(end) && end > now) return { state: 'open', daysLeft: null, trialStartedAt: null }
  }

  return { state: 'locked', status: subscription.status, checkout: null }
}

async function loadAccess(): Promise<Access> {
  try {
    const response = await fetch('/api/subscription', { cache: 'no-store', credentials: 'same-origin' })
    const body = (await response.json().catch(() => ({}))) as { subscription?: ServerSubscription; error?: string }
    if (!response.ok || !body.subscription) throw new Error(body.error ?? `Could not verify your subscription (${response.status}).`)

    const result = evaluate(body.subscription)
    if (result.state !== 'locked') return result

    const checkoutResponse = await fetch('/api/billing/checkout', { cache: 'no-store', credentials: 'same-origin' })
    const checkoutBody = (await checkoutResponse.json().catch(() => ({}))) as {
      checkout?: WhopCheckoutConfig
      error?: string
    }
    if (checkoutResponse.status !== 503 && !checkoutResponse.ok) {
      throw new Error(checkoutBody.error ?? `Could not prepare checkout (${checkoutResponse.status}).`)
    }
    return { ...result, checkout: checkoutResponse.ok ? checkoutBody.checkout ?? null : null }
  } catch (cause) {
    return { state: 'error', message: cause instanceof Error ? cause.message : 'Could not verify account access.' }
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export function TrialGate({ user, children }: { user: User; children: ReactNode }) {
  const [access, setAccess] = useState<Access>({ state: 'checking' })
  const refresh = useCallback(async () => {
    setAccess({ state: 'checking' })
    setAccess(await loadAccess())
  }, [])

  useEffect(() => {
    let alive = true
    const returningFromCheckout = new URLSearchParams(window.location.search).get('billing') === 'return'
    const load = async () => {
      let result = await loadAccess()
      if (returningFromCheckout && result.state === 'locked') {
        if (alive) setAccess({ state: 'confirming' })
        // The browser return is not proof of payment. Wait briefly for the signed Whop
        // webhook to update the database, then let the server decide access.
        for (const delay of [900, 1600, 2600, 4200]) {
          await wait(delay)
          result = await loadAccess()
          if (result.state !== 'locked') break
        }
      }
      if (alive) setAccess(result)
    }
    void load()
    const onFocus = () => { void loadAccess().then((result) => { if (alive) setAccess(result) }) }
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
    }
  }, [user.id])

  if (import.meta.env.DEV && isAdmin(user.email)) return <>{children}</>

  if (access.state === 'checking') {
    return (
      <div className="panel mx-auto mt-10 max-w-lg p-8 text-center" role="status" aria-live="polite">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-volt-2" />
        <h1 className="font-display mt-4 text-2xl font-bold text-white">Preparing your workspace</h1>
        <p className="mt-3 text-sm text-white">Checking your Proteus access securely…</p>
      </div>
    )
  }

  if (access.state === 'confirming') {
    return (
      <div className="panel mx-auto mt-10 max-w-lg p-8 text-center" role="status" aria-live="polite">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-volt-2" />
        <h1 className="font-display mt-4 text-2xl font-bold text-white">Confirming your membership</h1>
        <p className="mt-3 text-sm text-white/65">Whop is securely confirming your checkout. Access opens only after the signed membership update reaches Proteus.</p>
      </div>
    )
  }

  if (access.state === 'error') {
    return (
      <div className="panel mx-auto mt-10 max-w-lg p-8 text-center" role="alert">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-300" />
        <h1 className="font-display mt-4 text-2xl font-bold text-white">We couldn’t verify your plan</h1>
        <p className="mt-3 text-sm text-white/65">{access.message}</p>
        <button className="btn-glow btn-sm mt-6" onClick={() => void refresh()}>Try again</button>
      </div>
    )
  }

  if (access.state === 'locked') {
    const title = access.status === 'not_started'
      ? 'Start your free trial'
      : access.status === 'past_due'
        ? 'Payment needs attention'
        : access.status === 'canceled'
          ? 'Your subscription has ended'
          : 'Your free trial has ended'
    return (
      <div className="panel mx-auto mt-10 max-w-2xl p-6 text-center sm:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-volt/15 text-volt-2">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="glow-title font-display mt-4 text-3xl font-extrabold">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-white/70">
          Continue your adaptive plan, protein targets and monthly check-ins with the single Proteus plan for {integrations.pricing.label}/month.
          {access.status === 'not_started' ? ' Your 7-day trial begins after Whop confirms your membership. Whop collects a valid payment method now and charges after 7 days unless you cancel.' : ' Cancel anytime through Whop.'}
        </p>
        {access.checkout ? (
          <div className="mx-auto mt-6 max-w-xl text-left">
            <p className="mb-3 text-center text-xs text-white/55">Checkout is securely linked to {access.checkout.email}</p>
            <WhopCheckoutEmbed
              planId={access.checkout.planId}
              prefill={{ email: access.checkout.email }}
              disableEmail
              environment={access.checkout.environment}
              returnUrl={`${window.location.origin}/app?billing=return`}
              theme="dark"
              themeOptions={{ accentColor: '#3d8bff', backgroundColor: '#0A0F1D', borderRadius: 16 }}
              fallback={<div className="h-[520px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" aria-label="Loading secure checkout" />}
            />
          </div>
        ) : (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
            Whop checkout is not configured yet. The site owner needs an environment-matched Whop plan and webhook secret.
          </p>
        )}
        <button onClick={() => void refresh()} className="mt-5 text-sm font-semibold text-volt-2 hover:text-white">
          I’ve completed checkout — check my access
        </button>
      </div>
    )
  }

  return (
    <>
      {access.daysLeft !== null && access.daysLeft <= 3 && (
        <div className="mb-6 rounded-xl border border-volt/30 bg-volt/10 px-4 py-2.5 text-center text-sm text-white/80">
          {access.daysLeft} day{access.daysLeft === 1 ? '' : 's'} left in your free trial.
          {access.trialStartedAt && <span className="ml-2 text-xs text-white/55">Started {new Date(access.trialStartedAt).toLocaleDateString()}.</span>}
        </div>
      )}
      {children}
    </>
  )
}
