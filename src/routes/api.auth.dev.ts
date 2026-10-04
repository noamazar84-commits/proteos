import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers } from '../../db/schema'
import { rateLimit } from '../lib/server/security'
import { cookieHeader, createSession, SESSION_COOKIE, toPublicUser } from '../lib/server/session'

const DEV_ADMIN_EMAIL = 'noamazar84@gmail.com'
const json = (body: unknown, status = 200, cookies: string[] = []) => {
  const headers = new Headers({ 'cache-control': 'no-store, max-age=0' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(body, { status, headers })
}

export const Route = createFileRoute('/api/auth/dev')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.NODE_ENV === 'production') return json({ error: 'Development authentication is disabled.' }, 404)
        const limited = rateLimit(request, 'auth-dev', 5, 15 * 60_000)
        if (limited) return limited

        try {
          const db = getDb()
          const now = new Date()
          const devGoogleSub = 'dev-google-noamazar84'
          const [existing] = await db.select().from(customers).where(eq(customers.email, DEV_ADMIN_EMAIL)).limit(1)
          let customerId = existing?.id

          if (existing) {
            await db.update(customers).set({
              googleSub: existing.googleSub ?? devGoogleSub,
              emailVerified: true,
              legalConsentAt: existing.legalConsentAt ?? now,
              name: existing.name || 'Noam Azar',
              lastLoginAt: now,
            }).where(eq(customers.id, existing.id))
          } else {
            const inserted = await db.insert(customers).values({
              googleSub: devGoogleSub,
              email: DEV_ADMIN_EMAIL,
              emailVerified: true,
              legalConsentAt: now,
              name: 'Noam Azar',
              givenName: 'Noam',
              familyName: 'Azar',
              lastLoginAt: now,
            })
            customerId = Number(inserted[0].insertId)
          }

          if (!customerId) return json({ error: 'Development admin account could not be initialized.' }, 500)
          const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
          if (!customer) return json({ error: 'Development admin account could not be loaded.' }, 500)
          const session = await createSession(customer.id)
          return json({ user: toPublicUser(customer), development: true }, 200, [
            cookieHeader(request, SESSION_COOKIE, session.token, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000)),
          ])
        } catch {
          return json({ error: 'Development authentication is unavailable.' }, 503)
        }
      },
    },
  },
})
