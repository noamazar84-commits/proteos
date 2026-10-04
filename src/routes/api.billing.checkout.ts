import { createFileRoute } from '@tanstack/react-router'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { getSessionCustomer } from '../lib/server/session'

const PLAN_ID_PATTERN = /^plan_[A-Za-z0-9]+$/

export const Route = createFileRoute('/api/billing/checkout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'billing-checkout', 20, 60_000)
        if (limited) return limited
        const customer = await getSessionCustomer(request)
        if (!customer?.emailVerified) {
          return Response.json({ error: 'Verified sign-in required.' }, { status: 401 })
        }

        const planId = process.env.WHOP_PLAN_ID?.trim() ?? ''
        const environment = process.env.WHOP_CHECKOUT_ENVIRONMENT?.trim()
        if (!PLAN_ID_PATTERN.test(planId)) {
          return Response.json({ error: 'A valid Whop plan ID is not configured.' }, { status: 503 })
        }
        if (environment !== 'sandbox' && environment !== 'production') {
          return Response.json({ error: 'Whop checkout environment must be set to sandbox or production.' }, { status: 503 })
        }

        return Response.json({
          checkout: {
            planId,
            email: customer.email,
            environment,
          },
        }, { headers: { 'cache-control': 'no-store, max-age=0' } })
      },
    },
  },
})
