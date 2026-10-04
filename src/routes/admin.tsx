import { Link, createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, Lock, RefreshCcw, Search, Shield, UserRound } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { integrations, isAdmin } from '@/lib/integrations'
import { actions, type User, useAppState, useHydrated } from '@/lib/store'
import { PATHWAYS } from '@/lib/fixtures'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin — Proteus' }, { name: 'robots', content: 'noindex' }] }),
  component: Admin,
})

type Status = 'not_started' | 'trialing' | 'active' | 'past_due' | 'canceled'
interface CustomerRow {
  id: number
  email: string
  emailVerified: boolean
  name: string
  givenName: string | null
  familyName: string | null
  pictureUrl: string | null
  pathway: string | null
  currentWeightKg: number | null
  goalWeightKg: number | null
  activity: string | null
  planName: string
  status: Status
  trialDay: number | null
  trialEnded: boolean
  trialStartedAt: string | null
  trialEndsAt: string | null
  createdAt: string
  subscriptionStartedAt: string | null
  amountPaidCents: number
  paymentDate: string | null
  renewalDate: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
}
interface IntegrationState {
  googleClientId: boolean
  whopCheckout: boolean
  whopCheckoutEnvironment: 'sandbox' | 'production' | null
  whopWebhookSecret: boolean
  database: boolean
}

const STATUS_STYLE: Record<Status, string> = {
  not_started: 'bg-white/5 text-white/55 border-white/10',
  trialing: 'bg-volt/15 text-[#bfe0ff] border-volt/40',
  active: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  past_due: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
  canceled: 'bg-white/5 text-white/50 border-white/10',
}
const formatDate = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}
const pathwayName = (id: string | null) => PATHWAYS.find((pathway) => pathway.id === id)?.name ?? 'Not chosen'

function Admin() {
  const sessionReady = useHydrated()
  const { user } = useAppState()
  const [adminEmail, setAdminEmail] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [rows, setRows] = useState<CustomerRow[] | null>(null)
  const [integrationsState, setIntegrationsState] = useState<IntegrationState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [query, setQuery] = useState('')
  const allowed = !!user?.emailVerified && isAdmin(user.email)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/subscriptions', { cache: 'no-store', credentials: 'same-origin' })
      const body = await response.json().catch(() => ({})) as {
        customers?: CustomerRow[]
        integrations?: IntegrationState
        error?: string
      }
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
      if (!Array.isArray(body.customers) || !body.integrations) throw new Error('The customer response was incomplete.')
      setRows(body.customers)
      setIntegrationsState(body.integrations)
    } catch (cause) {
      setRows(null)
      setIntegrationsState(null)
      setError(cause instanceof Error ? cause.message : 'Could not load customer data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionReady && allowed) void load()
  }, [sessionReady, allowed, user?.id, load])

  const data = rows ?? []
  const stats = useMemo(() => {
    const count = (status: Status) => data.filter((row) => row.status === status).length
    return {
      total: data.length,
      active: count('active'),
      trialing: count('trialing'),
      pastDue: count('past_due'),
      canceled: count('canceled'),
      notStarted: count('not_started'),
    }
  }, [data])

  const normalizedQuery = query.trim().toLowerCase()
  const visible = data.filter((row) => {
    const pathway = pathwayName(row.pathway).toLowerCase()
    const matchesQuery = !normalizedQuery || row.email.toLowerCase().includes(normalizedQuery) || row.name.toLowerCase().includes(normalizedQuery) || pathway.includes(normalizedQuery)
    return matchesQuery && (filter === 'all' || row.status === filter)
  })

  if (!sessionReady) return <div className="stage min-h-dvh" />
  if (!allowed) {
    const hasAccount = !!user
    return (
      <div className="stage grid min-h-dvh place-items-center px-5 text-center">
        <div className="panel max-w-md p-8">
          <Lock className="mx-auto h-8 w-8 text-volt-2" />
          <h1 className="font-display mt-4 text-2xl font-bold text-white">Admin access only</h1>
          <p className="mt-2 text-sm text-white/65">{hasAccount ? `The signed-in account ${user.email} is not an authorized owner address.` : 'Enter an authorized owner email and we will send a short-lived code.'}</p>
          {!hasAccount && <AdminOtpLogin email={adminEmail} setEmail={setAdminEmail} code={adminCode} setCode={setAdminCode} codeSent={codeSent} setCodeSent={setCodeSent} onAuthenticated={(nextUser) => actions.setSession(nextUser)} />}
          <Link to="/" className="mt-4 inline-block rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white">Back to Proteus</Link>
        </div>
      </div>
    )
  }

  const integrationRows = [
    { name: 'Admin email OTP', ready: true, detail: 'Authorized owner addresses receive a single-use code that expires after 10 minutes.' },
    { name: 'Whop checkout', ready: !!integrationsState?.whopCheckout, detail: integrationsState?.whopCheckout ? `Verified customer email is prefilled in the ${integrationsState.whopCheckoutEnvironment} embedded checkout.` : 'Add WHOP_PLAN_ID and set WHOP_CHECKOUT_ENVIRONMENT to sandbox (Preview) or production (Live); configure the recurring plan with a 7-day trial.' },
    { name: 'Whop webhook', ready: !!integrationsState?.whopWebhookSecret, detail: integrationsState?.whopWebhookSecret ? 'Signed v1 events update membership, trial, payment, cancellation, and renewal records.' : 'Add WHOP_WEBHOOK_SECRET and register POST /api/webhooks/payment in Whop.' },
    { name: 'Customer database', ready: !!integrationsState?.database, detail: integrationsState?.database ? 'Managed MySQL customer and webhook records are connected.' : 'Database connection is not available.' },
  ]

  return (
    <div className="stage min-h-dvh">
      <header className="border-b border-white/5 bg-[#0A0F1D]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Proteus home"><Logo size="sm" /></Link>
            <span className="rounded-full border border-volt/40 bg-volt/10 px-2.5 py-0.5 text-xs font-semibold text-[#bfe0ff]">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/50 sm:inline">{user.email}</span>
            <button onClick={() => void load()} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:text-white" disabled={loading}>
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/app" className="flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-8">
        <div className="text-center">
          <div className="chip mx-auto"><Shield className="h-3.5 w-3.5" /> Owner dashboard</div>
          <h1 className="glow-title font-display mt-4 text-3xl font-extrabold sm:text-4xl">Customer management</h1>
          <p className="mt-2 text-sm text-white/60">Registered accounts and their single Proteus plan, trial, and billing timeline.</p>
        </div>

        {error && <p className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-center text-sm text-rose-200" role="alert">{error}</p>}

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Registered users" value={stats.total} />
          <Kpi label="Trialing" value={stats.trialing} />
          <Kpi label="Active plan" value={stats.active} />
          <Kpi label="Not started" value={stats.notStarted} />
          <Kpi label="Past due" value={stats.pastDue} />
          <Kpi label="Canceled" value={stats.canceled} />
        </div>

        <section className="panel mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'not_started', 'trialing', 'active', 'past_due', 'canceled'] as const).map((status) => (
                <button key={status} type="button" className="seg capitalize" data-active={filter === status} onClick={() => setFilter(status)}>
                  {status === 'all' ? 'All users' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
            <label className="relative lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input className="field pl-9 text-sm" placeholder="Search name, email, or pathway" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/45">
                <tr>
                  {['Customer', 'Personal details', 'Plan', 'Status', '7-day trial', 'Joined', 'Subscription date', 'Last payment', 'Next billing'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map((row) => (
                  <tr key={row.id} className="align-top text-white/85 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {row.pictureUrl ? (
                          <img src={row.pictureUrl} alt="" className="h-10 w-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-volt/15 text-volt-2"><UserRound className="h-4 w-4" /></span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-56 truncate font-semibold text-white">{row.name || 'Google customer'}</span>
                          <span className="block max-w-56 truncate text-xs text-white/55">{row.email}</span>
                          {!row.emailVerified && <span className="text-[10px] text-amber-200">Email not verified</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block font-medium text-white/85">{pathwayName(row.pathway)}</span>
                      <span className="mt-1 block text-xs text-white/55">
                        {row.currentWeightKg !== null ? `${row.currentWeightKg} kg current` : 'Current weight —'}
                        {' · '}
                        {row.goalWeightKg !== null ? `${row.goalWeightKg} kg goal` : 'Goal —'}
                      </span>
                      <span className="block text-xs capitalize text-white/45">Activity: {row.activity ?? '—'}</span>
                    </td>
                    <td className="px-4 py-4 font-medium text-white/80">{row.planName || 'Single plan'}</td>
                    <td className="px-4 py-4">
                      <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[row.status] ?? STATUS_STYLE.not_started}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                      {row.cancelAtPeriodEnd && <span className="mt-2 block text-[11px] text-amber-200">Cancels at renewal</span>}
                    </td>
                    <td className="px-4 py-4">
                      {row.trialDay !== null ? (
                        <span className="whitespace-nowrap font-semibold text-[#bfe0ff]">
                          Day {row.trialDay} of 7{row.trialEnded ? ' · ended' : ''}
                        </span>
                      ) : row.trialStartedAt && row.status === 'active' ? (
                        <span className="whitespace-nowrap text-white/60">Complete · 7/7</span>
                      ) : <span className="text-white/35">Not started</span>}
                      {row.trialStartedAt && <span className="mt-1 block text-xs text-white/45">Ends {formatDate(row.trialEndsAt)}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDate(row.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDate(row.subscriptionStartedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDate(row.paymentDate)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDate(row.renewalDate)}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-white/50">
                      {loading ? 'Loading customer records…' : data.length === 0 ? 'No registered customers yet. New verified sign-ins will appear here.' : 'No customers match the selected search and status.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/5 px-4 py-3 text-xs text-white/40">
            {loading ? 'Refreshing…' : `${visible.length} of ${data.length} customer${data.length === 1 ? '' : 's'} · latest sign-ups first`}
          </div>
        </section>

        <section className="panel mt-6 p-6">
          <h2 className="font-display text-lg font-bold text-white">Integration status</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {integrationRows.map((integration) => (
              <li key={integration.name} className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                {integration.ready ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{integration.name}</span>
                  <span className="block break-words text-xs text-white/55">{integration.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

function AdminOtpLogin({ email, setEmail, code, setCode, codeSent, setCodeSent, onAuthenticated }: {
  email: string
  setEmail: (value: string) => void
  code: string
  setCode: (value: string) => void
  codeSent: boolean
  setCodeSent: (value: boolean) => void
  onAuthenticated: (user: User) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: codeSent ? 'verify' : 'request', email, ...(codeSent ? { code } : {}) }),
      })
      const body = await response.json().catch(() => ({})) as { user?: User; message?: string; error?: string }
      if (!response.ok && response.status !== 202) throw new Error(body.error ?? 'Admin login could not be completed.')
      if (codeSent && body.user) onAuthenticated(body.user)
      else setCodeSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Admin login could not be completed.')
    } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="mt-6 space-y-3 text-left">
    <label className="block text-xs font-semibold uppercase tracking-wider text-white/50">Owner email<input autoFocus className="field mt-2" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={codeSent} placeholder={integrations.admin.email} /></label>
    {codeSent && <label className="block text-xs font-semibold uppercase tracking-wider text-white/50">Email code<input className="field mt-2 tracking-[0.35em]" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label>}
    {error && <p className="text-sm text-rose-200" role="alert">{error}</p>}
    <button type="submit" className="btn-glow btn-sm w-full" disabled={busy}>{busy ? 'Please wait…' : codeSent ? 'Verify code and open dashboard' : 'Email me a login code'}</button>
    {codeSent && <button type="button" className="w-full text-xs text-white/50 hover:text-white" onClick={() => { setCodeSent(false); setCode(''); setError(null) }}>Use a different email</button>}
  </form>
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel px-4 py-4 text-center">
      <div className="glow-text font-display text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  )
}
