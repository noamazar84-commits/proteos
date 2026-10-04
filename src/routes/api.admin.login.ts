import { randomInt, createHash } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { adminLoginTokens, customers } from '../../db/schema'
import { isAdmin } from '../lib/integrations'
import { sendAdminLoginCode } from '../lib/server/email'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { cookieHeader, createSession, SESSION_COOKIE, toPublicUser } from '../lib/server/session'

const NO_CACHE = { 'cache-control': 'no-store, max-age=0' }
const normalizeEmail = (value: unknown) => typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value.trim()) ? value.trim().toLowerCase() : null
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const json = (body: unknown, status = 200, cookies: string[] = []) => {
  const headers = new Headers(NO_CACHE)
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(body, { status, headers })
}

export const Route = createFileRoute('/api/admin/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasTrustedOrigin(request)) return json({ error: 'Request origin could not be verified.' }, 403)
        const limited = rateLimit(request, 'admin-login', 12, 15 * 60_000)
        if (limited) return limited
        const body = await request.json().catch(() => null) as Record<string, unknown> | null
        const action = body?.action === 'request' || body?.action === 'verify' ? body.action : null
        const email = normalizeEmail(body?.email)
        if (!action || !email) return json({ error: 'Enter a valid email address.' }, 400)

        if (action === 'request') {
          if (isAdmin(email)) {
            const code = String(randomInt(100000, 1000000))
            await getDb().insert(adminLoginTokens).values({ tokenHash: hash(code), email, expiresAt: new Date(Date.now() + 10 * 60_000) })
            if (!await sendAdminLoginCode(email, code)) return json({ error: 'The admin email service is not configured.' }, 503)
          }
          return json({ sent: true, message: 'If that address is an authorized owner address, a one-time code has been sent.' }, 202)
        }

        const code = typeof body?.code === 'string' ? body.code.trim() : ''
        if (!/^\d{6}$/.test(code)) return json({ error: 'Enter the six-digit code from your email.' }, 400)
        if (!isAdmin(email)) return json({ error: 'That code is not valid.' }, 401)
        const [token] = await getDb().select().from(adminLoginTokens).where(and(
          eq(adminLoginTokens.tokenHash, hash(code)),
          eq(adminLoginTokens.email, email),
          isNull(adminLoginTokens.usedAt),
          gt(adminLoginTokens.expiresAt, new Date()),
        )).limit(1)
        if (!token) return json({ error: 'That code is invalid or expired.' }, 401)

        const db = getDb()
        await db.update(adminLoginTokens).set({ usedAt: new Date() }).where(eq(adminLoginTokens.tokenHash, token.tokenHash))
        const now = new Date()
        const [existing] = await db.select().from(customers).where(eq(customers.email, email)).limit(1)
        let customerId = existing?.id
        if (existing) {
          await db.update(customers).set({ emailVerified: true, legalConsentAt: existing.legalConsentAt ?? now, adultConfirmedAt: existing.adultConfirmedAt ?? now, lastLoginAt: now }).where(eq(customers.id, existing.id))
        } else {
          const inserted = await db.insert(customers).values({ email, emailVerified: true, legalConsentAt: now, adultConfirmedAt: now, name: email.split('@')[0], lastLoginAt: now })
          customerId = Number(inserted[0].insertId)
        }
        if (!customerId) return json({ error: 'Admin account could not be initialized.' }, 500)
        const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
        if (!customer) return json({ error: 'Admin account could not be loaded.' }, 500)
        const session = await createSession(customer.id)
        return json({ user: toPublicUser(customer) }, 200, [cookieHeader(request, SESSION_COOKIE, session.token, 30 * 24 * 60 * 60)])
      },
    },
  },
})
