import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers } from '../../db/schema'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { getSessionCustomer } from '../lib/server/session'

export const Route = createFileRoute('/api/subscription')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'subscription', 60, 60_000)
        if (limited) return limited
        const sessionCustomer = await getSessionCustomer(request)
        if (!sessionCustomer?.emailVerified) return Response.json({ error: 'Verified sign-in required.' }, { status: 401 })
        const [record] = await getDb()
          .select({
            status: customers.status,
            trialStartedAt: customers.trialStartedAt,
            trialEndsAt: customers.trialEndsAt,
            subscriptionStartedAt: customers.subscriptionStartedAt,
            paymentDate: customers.paymentDate,
            renewalDate: customers.renewalDate,
            cancelAtPeriodEnd: customers.cancelAtPeriodEnd,
          })
          .from(customers)
          .where(eq(customers.id, sessionCustomer.id))
          .limit(1)
        if (!record) return Response.json({ error: 'Customer record not found.' }, { status: 404 })
        const allowed = ['not_started', 'trialing', 'active', 'past_due', 'canceled'] as const
        const status = (allowed as readonly string[]).includes(record.status)
          ? record.status as typeof allowed[number]
          : 'not_started'
        return Response.json({ subscription: { ...record, status } }, { headers: { 'cache-control': 'no-store, max-age=0' } })
      },
    },
  },
})
