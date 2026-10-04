import { desc } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers } from '../../db/schema'
import { isAdmin } from '../lib/integrations'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { getSessionCustomer } from '../lib/server/session'

const DAY_MS = 86_400_000
const TRIAL_DAYS = 7

export const Route = createFileRoute('/api/admin/subscriptions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'admin-subscriptions', 30, 60_000)
        if (limited) return limited
        const owner = await getSessionCustomer(request)
        if (!owner?.emailVerified || !isAdmin(owner.email)) {
          return Response.json({ error: 'Verified owner account required.' }, { status: 403 })
        }

        const rows = await getDb().select().from(customers).orderBy(desc(customers.createdAt))
        const now = Date.now()
        const customerRows = rows.map((row) => {
          const allowedStatuses = ['not_started', 'trialing', 'active', 'past_due', 'canceled'] as const
          const status = (allowedStatuses as readonly string[]).includes(row.status)
            ? row.status as typeof allowedStatuses[number]
            : 'not_started'
          const trialStartedAt = row.trialStartedAt?.toISOString() ?? null
          const trialEndsAt = row.trialEndsAt?.toISOString() ?? null
          const elapsed = row.trialStartedAt ? Math.floor((now - row.trialStartedAt.getTime()) / DAY_MS) + 1 : null
          const trialDay = status === 'trialing' && elapsed !== null
            ? Math.max(1, Math.min(TRIAL_DAYS, elapsed))
            : null
          return {
            id: row.id,
            email: row.email,
            emailVerified: row.emailVerified,
            name: row.name,
            givenName: row.givenName,
            familyName: row.familyName,
            pictureUrl: row.pictureUrl,
            pathway: row.pathway,
            currentWeightKg: row.currentWeightKg,
            goalWeightKg: row.goalWeightKg,
            activity: row.activity,
            planName: row.planName,
            status,
            trialDay,
            trialEnded: status === 'trialing' && !!row.trialEndsAt && row.trialEndsAt.getTime() <= now,
            trialStartedAt,
            trialEndsAt,
            createdAt: row.createdAt.toISOString(),
            subscriptionStartedAt: row.subscriptionStartedAt?.toISOString() ?? null,
            amountPaidCents: row.amountPaidCents,
            paymentDate: row.paymentDate?.toISOString() ?? null,
            renewalDate: row.renewalDate?.toISOString() ?? null,
            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
            canceledAt: row.canceledAt?.toISOString() ?? null,
          }
        })

        const configuredEnvironment = process.env.WHOP_CHECKOUT_ENVIRONMENT?.trim()
        const whopCheckoutEnvironment = configuredEnvironment === 'sandbox' || configuredEnvironment === 'production'
          ? configuredEnvironment
          : null

        return Response.json({
          customers: customerRows,
          integrations: {
            googleClientId: !!process.env.GOOGLE_CLIENT_ID,
            whopCheckout: !!process.env.WHOP_PLAN_ID?.trim() && whopCheckoutEnvironment !== null,
            whopCheckoutEnvironment,
            whopWebhookSecret: !!process.env.WHOP_WEBHOOK_SECRET,
            database: true,
          },
        }, { headers: { 'cache-control': 'no-store, max-age=0' } })
      },
    },
  },
})
