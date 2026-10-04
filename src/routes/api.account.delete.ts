import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers } from '../../db/schema'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { clearCookieHeader, getSessionCustomer, hasSameOrigin, revokeSession, SESSION_COOKIE } from '../lib/server/session'

export const Route = createFileRoute('/api/account/delete')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        if (!hasSameOrigin(request) || !hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'account-delete', 3, 60 * 60_000)
        if (limited) return limited
        const customer = await getSessionCustomer(request)
        if (!customer?.emailVerified) return Response.json({ error: 'Verified sign-in required.' }, { status: 401 })
        const body = await request.json().catch(() => null) as { confirmation?: unknown } | null
        if (body?.confirmation !== 'DELETE') return Response.json({ error: 'Type DELETE to confirm account deletion.' }, { status: 400 })

        const [billing] = await getDb().select({ status: customers.status, cancelAtPeriodEnd: customers.cancelAtPeriodEnd })
          .from(customers).where(eq(customers.id, customer.id)).limit(1)
        if (!billing) return Response.json({ error: 'Account not found.' }, { status: 404 })
        if (['trialing', 'active', 'past_due'].includes(billing.status) && !billing.cancelAtPeriodEnd) {
          return Response.json({ error: 'Cancel your Whop subscription first. Your account can be deleted after Whop confirms cancellation.' }, { status: 409 })
        }

        await revokeSession(request)
        await getDb().delete(customers).where(eq(customers.id, customer.id))
        return Response.json({ deleted: true }, {
          headers: { 'cache-control': 'no-store, max-age=0', 'set-cookie': clearCookieHeader(request, SESSION_COOKIE) },
        })
      },
    },
  },
})
