import { createFileRoute } from '@tanstack/react-router'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { getSessionCustomer } from '../lib/server/session'

function safeManageUrl() {
  const value = process.env.WHOP_MANAGE_URL?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/billing/manage')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'billing-manage', 20, 60_000)
        if (limited) return limited
        const customer = await getSessionCustomer(request)
        if (!customer?.emailVerified) return Response.json({ error: 'Verified sign-in required.' }, { status: 401 })
        return Response.json({ manageUrl: safeManageUrl() }, { headers: { 'cache-control': 'no-store, max-age=0' } })
      },
    },
  },
})
