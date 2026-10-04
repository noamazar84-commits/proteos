import { randomBytes } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers } from '../../db/schema'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { clearCookieHeader, cookieHeader, createSession, GOOGLE_NONCE_COOKIE, hasSameOrigin, readCookie, SESSION_COOKIE, toPublicUser } from '../lib/server/session'

const NO_CACHE = { 'cache-control': 'no-store, max-age=0' }
const json = (body: unknown, status = 200, cookies: string[] = []) => {
  const headers = new Headers(NO_CACHE)
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(body, { status, headers })
}

function duplicateKey(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; errno?: unknown }
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062
}

export const Route = createFileRoute('/api/auth/google')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasTrustedOrigin(request)) return json({ error: 'Request origin could not be verified.' }, 403)
        const limited = rateLimit(request, 'auth-google-config', 20, 15 * 60_000)
        if (limited) return limited
        const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
        if (!clientId) return json({ error: 'Google Sign-In is not configured on this deployment.' }, 503)
        const nonce = randomBytes(32).toString('base64url')
        return json({ clientId, nonce }, 200, [cookieHeader(request, GOOGLE_NONCE_COOKIE, nonce, 300)])
      },
      POST: async ({ request }) => {
        const clearNonce = clearCookieHeader(request, GOOGLE_NONCE_COOKIE)
        if (!hasSameOrigin(request)) return json({ error: 'Request origin could not be verified.' }, 403, [clearNonce])
        const limited = rateLimit(request, 'auth-google', 10, 15 * 60_000)
        if (limited) return limited
        if (!hasTrustedOrigin(request)) return json({ error: 'Request origin could not be verified.' }, 403, [clearNonce])
        const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
        if (!clientId) return json({ error: 'Google Sign-In is not configured on this deployment.' }, 503, [clearNonce])

        const nonce = readCookie(request, GOOGLE_NONCE_COOKIE)
        let body: { credential?: unknown; consentAccepted?: unknown; adultConfirmed?: unknown } | null = null
        try {
          if (Number(request.headers.get('content-length') ?? 0) > 20_000) return json({ error: 'Credential payload is too large.' }, 413, [clearNonce])
          body = await request.json() as { credential?: unknown; consentAccepted?: unknown; adultConfirmed?: unknown }
        } catch {
          return json({ error: 'Invalid sign-in request.' }, 400, [clearNonce])
        }
        const credential = typeof body?.credential === 'string' ? body.credential : ''
        if (!nonce || !credential || credential.length > 20_000) return json({ error: 'Google sign-in expired. Please try again.' }, 401, [clearNonce])

        let payload
        try {
          const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId })
          payload = ticket.getPayload()
        } catch {
          return json({ error: 'Google could not verify this sign-in. Please try again.' }, 401, [clearNonce])
        }
        if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== nonce) {
          return json({ error: 'Use a Google account with a verified email, then try again.' }, 401, [clearNonce])
        }

        const email = payload.email.trim().toLowerCase()
        if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Google did not provide a valid verified email.' }, 401, [clearNonce])
        const db = getDb()
        const now = new Date()
        const consentAccepted = body?.consentAccepted === true
        const adultConfirmed = body?.adultConfirmed === true
        const accountData = {
          email,
          emailVerified: true,
          name: (payload.name?.trim() || email.split('@')[0]).slice(0, 255),
          givenName: payload.given_name?.slice(0, 200) ?? null,
          familyName: payload.family_name?.slice(0, 200) ?? null,
          pictureUrl: payload.picture?.slice(0, 2048) ?? null,
          lastLoginAt: now,
        }

        try {
          const [bySub] = await db.select().from(customers).where(eq(customers.googleSub, payload.sub)).limit(1)
          let customerId: number
          if (bySub) {
            const [emailOwner] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1)
            if (emailOwner && emailOwner.id !== bySub.id) {
              return json({ error: 'This verified email is already linked to another Google account. Contact support to resolve the account link.' }, 409, [clearNonce])
            }
            await db.update(customers).set(accountData).where(eq(customers.id, bySub.id))
            customerId = bySub.id
          } else {
            const [emailOwner] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1)
            if (emailOwner) {
              return json({ error: 'This email is linked to a different Google account. Sign in with the Google account originally used for Proteus.' }, 409, [clearNonce])
            }
            if (!consentAccepted) return json({ error: 'You must agree to the Terms of Use, Privacy Policy, and No-Refund Policy.' }, 400, [clearNonce])
            if (!adultConfirmed) return json({ error: 'Proteus is for adults 18 and over. Confirm your age to create an account.' }, 400, [clearNonce])
            try {
              await db.insert(customers).values({ googleSub: payload.sub, legalConsentAt: now, adultConfirmedAt: now, ...accountData })
            } catch (error) {
              if (!duplicateKey(error)) throw error
              const [racedCustomer] = await db.select({ id: customers.id, googleSub: customers.googleSub }).from(customers).where(eq(customers.email, email)).limit(1)
              if (!racedCustomer || racedCustomer.googleSub !== payload.sub) {
                return json({ error: 'This email is already linked to another Google account.' }, 409, [clearNonce])
              }
              await db.update(customers).set(accountData).where(eq(customers.id, racedCustomer.id))
            }
            const [created] = await db.select({ id: customers.id }).from(customers).where(eq(customers.googleSub, payload.sub)).limit(1)
            if (!created) throw new Error('Customer creation did not return a record')
            customerId = created.id
          }

          const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
          if (!customer || !customer.emailVerified) throw new Error('Verified customer session could not be created')
          const session = await createSession(customer.id)
          const response = json({ user: toPublicUser(customer) }, 200, [
            cookieHeader(request, SESSION_COOKIE, session.token, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000)),
            clearNonce,
          ])
          return response
        } catch (error) {
          console.error('Google account persistence failed.')
          return json({ error: 'Your verified Google account could not be saved. Please try again.' }, 500, [clearNonce])
        }
      },
    },
  },
})
