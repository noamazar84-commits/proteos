import { createHmac, timingSafeEqual } from 'node:crypto'

const DAY_MS = 86_400_000
export type WhopEventKind =
  | 'trial_started'
  | 'membership_active'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'membership_canceled'
  | 'cancel_schedule_changed'
  | 'ignored'

export interface NormalizedWhopEvent {
  id: string
  eventType: string
  eventAt: Date
  paymentDate: Date | null
  email: string | null
  membershipId: string | null
  kind: WhopEventKind
  trialStartedAt: Date | null
  trialEndsAt: Date | null
  renewalDate: Date | null
  amountPaidCents: number | null
  cancelAtPeriodEnd: boolean | null
}

type RecordValue = Record<string, unknown>
const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value)
const stringValue = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const firstString = (...values: unknown[]) => values.map(stringValue).find((value): value is string => !!value) ?? null

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const input = typeof value === 'string' ? value.trim() : value
  if (input === '') return null
  const numeric = typeof input === 'number' || /^\d+(?:\.\d+)?$/.test(input) ? Number(input) : null
  const date = numeric !== null ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(input)
  return Number.isFinite(date.getTime()) ? date : null
}

function firstDate(...values: unknown[]) {
  for (const value of values) {
    const parsed = parseDate(value)
    if (parsed) return parsed
  }
  return null
}

function boolValue(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    if (value === 'true' || value === 1 || value === '1') return true
    if (value === 'false' || value === 0 || value === '0') return false
  }
  return null
}

function objectAt(parent: RecordValue, key: string): RecordValue {
  const value = parent[key]
  return isRecord(value) ? value : {}
}

function safeTextEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Whop's v1 secret is used exactly as issued, including its `ws_` prefix. */
export function verifyWhopSignature(rawBody: string, headers: Headers, secret = process.env.WHOP_WEBHOOK_SECRET): boolean {
  const webhookId = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const signatures = headers.get('webhook-signature')
  if (!secret?.startsWith('ws_') || !webhookId || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const expected = createHmac('sha256', secret).update(`${webhookId}.${timestamp}.${rawBody}`, 'utf8').digest('base64')
  return signatures.split(/\s+/).some((candidate) => {
    if (!candidate.startsWith('v1,')) return false
    return safeTextEqual(candidate.slice(3), expected)
  })
}

export function normalizeWhopEvent(payload: unknown, webhookId: string, timestamp: string): NormalizedWhopEvent | null {
  if (!isRecord(payload)) return null
  const data = objectAt(payload, 'data')
  const membership = objectAt(data, 'membership')
  const member = objectAt(data, 'member')
  const user = objectAt(data, 'user')
  const memberUser = objectAt(member, 'user')
  const membershipUser = objectAt(membership, 'user')
  const payment = objectAt(data, 'payment')
  const customer = objectAt(data, 'customer')
  const eventType = firstString(payload.type, payload.event_type, payload.event)
  if (!eventType) return null

  const email = firstString(
    data.email,
    data.user_email,
    user.email,
    member.email,
    memberUser.email,
    membership.email,
    membershipUser.email,
    payment.email,
    customer.email,
  )?.toLowerCase() ?? null
  const emailIsValid = email && /^\S+@\S+\.\S+$/.test(email) ? email : null
  const membershipId = firstString(
    data.membership_id,
    data.membershipId,
    membership.id,
    payment.membership_id,
    objectAt(payment, 'membership').id,
    eventType.startsWith('membership.') ? data.id : null,
  )
  const eventAt = firstDate(payload.created_at, payload.timestamp, data.created_at, data.updated_at) ?? new Date(Number(timestamp) * 1000)
  const paymentDate = firstDate(data.paid_at, payment.paid_at, data.succeeded_at, payment.succeeded_at)
  const rawStatus = firstString(data.status, membership.status)?.toLowerCase() ?? ''
  const explicitTrialStart = firstDate(
    data.trial_started_at, data.trial_start, data.trial_start_at, data.current_period_start,
    membership.trial_started_at, membership.trial_start, membership.current_period_start,
  )
  const explicitTrialEnd = firstDate(
    data.trial_ends_at, data.trial_end, data.trial_end_at, data.trial_period_end, data.current_period_end,
    membership.trial_ends_at, membership.trial_end, membership.trial_period_end, membership.current_period_end,
  )
  const renewalDate = firstDate(
    data.renewal_period_end,
    data.renewal_date,
    data.next_billing_date,
    data.next_payment_at,
    data.expires_at,
    data.current_period_end,
    membership.renewal_period_end,
    membership.renewal_date,
    membership.next_billing_date,
    membership.expires_at,
    membership.current_period_end,
  )
  const isTrial = rawStatus === 'trialing' || rawStatus === 'trial' ||
    boolValue(data.is_trial, membership.is_trial, data.trial_enabled) === true ||
    explicitTrialStart !== null || explicitTrialEnd !== null

  let kind: WhopEventKind = 'ignored'
  let trialStartedAt: Date | null = explicitTrialStart
  let trialEndsAt: Date | null = explicitTrialEnd
  let amountPaidCents: number | null = null
  let cancelAtPeriodEnd: boolean | null = null

  switch (eventType) {
    case 'membership.trial_started':
      kind = 'trial_started'
      break
    case 'membership.activated':
      kind = isTrial ? 'trial_started' : 'membership_active'
      break
    case 'membership.went_valid':
      kind = isTrial ? 'trial_started' : 'membership_active'
      break
    case 'payment.succeeded': {
      kind = 'payment_succeeded'
      const amount = data.amount_cents ?? data.final_amount_cents ?? data.amount_paid_cents
      const parsed = typeof amount === 'number' || (typeof amount === 'string' && /^\d+$/.test(amount)) ? Number(amount) : NaN
      amountPaidCents = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
      break
    }
    case 'payment.failed':
      kind = 'payment_failed'
      break
    case 'membership.deactivated':
    case 'membership.went_invalid':
      kind = 'membership_canceled'
      break
    case 'membership.cancel_at_period_end_changed':
      kind = 'cancel_schedule_changed'
      cancelAtPeriodEnd = boolValue(data.cancel_at_period_end, membership.cancel_at_period_end)
      break
    default:
      if (eventType === 'membership.updated' && rawStatus === 'trialing') kind = 'trial_started'
      else if (eventType === 'membership.updated' && ['active', 'valid'].includes(rawStatus)) kind = 'membership_active'
      else if (eventType === 'membership.updated' && ['canceled', 'cancelled', 'invalid', 'expired'].includes(rawStatus)) kind = 'membership_canceled'
      break
  }

  if (kind === 'trial_started') {
    trialStartedAt ??= eventAt
    const candidateEnd = trialEndsAt ?? renewalDate
    const candidateDuration = candidateEnd ? candidateEnd.getTime() - trialStartedAt.getTime() : 0
    trialEndsAt = candidateEnd && candidateDuration > 0 && candidateDuration <= 8 * DAY_MS
      ? candidateEnd
      : new Date(trialStartedAt.getTime() + 7 * DAY_MS)
  }

  return {
    id: webhookId,
    eventType: eventType.slice(0, 100),
    eventAt,
    paymentDate,
    email: emailIsValid,
    membershipId,
    kind,
    trialStartedAt,
    trialEndsAt,
    renewalDate,
    amountPaidCents,
    cancelAtPeriodEnd,
  }
}
