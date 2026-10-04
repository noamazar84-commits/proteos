import { createFileRoute } from '@tanstack/react-router'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { clearCookieHeader, getSessionCustomer, hasSameOrigin, revokeSession, SESSION_COOKIE, toPublicUser } from '../lib/server/session'

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const customer = await getSessionCustomer(request)
        if (!customer || !customer.emailVerified) {
          return Response.json({ user: null }, {
            status: 401,
            headers: {
              'cache-control': 'no-store, max-age=0',
              'set-cookie': clearCookieHeader(request, SESSION_COOKIE),
            },
          })
        }
        return Response.json({ user: toPublicUser(customer) }, { headers: { 'cache-control': 'no-store, max-age=0' } })
      },
      DELETE: async ({ request }) => {
        if (!hasSameOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        if (!hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'auth-logout', 20, 15 * 60_000)
        if (limited) return limited
        try {
          await revokeSession(request)
          return Response.json({ signedOut: true }, {
            headers: {
              'cache-control': 'no-store, max-age=0',
              'set-cookie': clearCookieHeader(request, SESSION_COOKIE),
            },
          })
        } catch {
          return Response.json({ error: 'The session could not be revoked right now.' }, {
            status: 503,
            headers: { 'cache-control': 'no-store, max-age=0', 'set-cookie': clearCookieHeader(request, SESSION_COOKIE) },
          })
        }
      },
    },
  },
})
