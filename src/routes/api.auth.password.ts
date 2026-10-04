import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers, emailVerificationTokens } from '../../db/schema'
import { integrations } from '../lib/integrations'
import { hashVerificationToken, sendVerificationEmail } from '../lib/server/email'
import { hashPassword, verifyPassword } from '../lib/server/password'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { clearCookieHeader, cookieHeader, createSession, hasSameOrigin, SESSION_COOKIE, toPublicUser } from '../lib/server/session'

const NO_CACHE = { 'cache-control': 'no-store, max-age=0' }
const json = (body: unknown, status = 200, cookies: string[] = []) => {
  const headers = new Headers(NO_CACHE)
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(body, { status, headers })
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^\S+@\S+\.\S+$/.test(email) && email.length <= 320 ? email : null
}

export const Route = createFileRoute('/api/auth/password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasSameOrigin(request)) return json({ error: 'Request origin could not be verified.' }, 403)
        const limited = rateLimit(request, 'auth-password', 10, 15 * 60_000)
        if (limited) return limited
        if (Number(request.headers.get('content-length') ?? 0) > 20_000) return json({ error: 'Request payload is too large.' }, 413)
        const body = await request.json().catch(() => null) as Record<string, unknown> | null
        const mode = body?.mode === 'signup' || body?.mode === 'login' ? body.mode : null
        const email = normalizeEmail(body?.email)
        const password = typeof body?.password === 'string' ? body.password : ''
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 255) : ''
        const adultConfirmed = body?.adultConfirmed === true

        if (!mode || !email || password.length < 8 || password.length > 128) {
          return json({ error: 'Enter a valid email and a password between 8 and 128 characters.' }, 400)
        }
        if (mode === 'signup' && body?.consentAccepted !== true) {
          return json({ error: 'You must agree to the Terms of Use, Privacy Policy, and No-Refund Policy.' }, 400)
        }
        if (mode === 'signup' && !adultConfirmed) {
          return json({ error: 'Proteus is for adults 18 and over. Confirm your age to create an account.' }, 400)
        }
        if (!hasTrustedOrigin(request)) return json({ error: 'Request origin could not be verified.' }, 403)
        if (mode === 'signup' && email === integrations.admin.email) {
          return json({ error: 'The owner account must use verified Google Sign-In.' }, 403)
        }

        const db = getDb()
        const [existing] = await db.select().from(customers).where(eq(customers.email, email)).limit(1)

        if (mode === 'signup') {
          if (existing) return json({ error: 'An account with this email already exists. Sign in instead.' }, 409)
          const now = new Date()
          let createdCustomerId: number
          try {
            const result = await db.insert(customers).values({
              googleSub: null,
              passwordHash: hashPassword(password),
              email,
              // Password registration must not grant a session until a transactional
              // email provider delivers and confirms a one-time verification token.
              emailVerified: false,
              legalConsentAt: now,
              adultConfirmedAt: now,
              name: name || email.split('@')[0].slice(0, 255),
              givenName: (name.split(/\s+/)[0] || email.split('@')[0]).slice(0, 200),
              familyName: name.split(/\s+/).slice(1).join(' ').slice(0, 200) || null,
              lastLoginAt: now,
            })
            createdCustomerId = Number(result[0].insertId)
            const token = randomBytes(32).toString('base64url')
            await db.insert(emailVerificationTokens).values({
              tokenHash: hashVerificationToken(token),
              customerId: createdCustomerId,
              expiresAt: new Date(Date.now() + 30 * 60_000),
            })
            if (!await sendVerificationEmail(email, token)) {
              await db.delete(customers).where(eq(customers.id, createdCustomerId))
              return json({ error: 'Email verification is not configured on this deployment.' }, 503)
            }
          } catch (error) {
            console.error('Password account creation failed.')
            return json({ error: 'Your account could not be created. Please try again.' }, 500)
          }
          return json({ verificationRequired: true, message: 'Check your email to verify your account before signing in.' }, 202)
        } else if (!existing || !existing.passwordHash || !verifyPassword(password, existing.passwordHash)) {
          return json({ error: 'Email or password is incorrect.' }, 401)
        }

        const customer = existing
        if (!customer || !customer.emailVerified) return json({ error: 'Your account could not be signed in.' }, 401)

        if (mode === 'login') {
          await db.update(customers).set({ lastLoginAt: new Date() }).where(eq(customers.id, customer.id))
        }
        const session = await createSession(customer.id)
        return json({ user: toPublicUser(customer) }, 200, [
          cookieHeader(request, SESSION_COOKIE, session.token, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
          clearCookieHeader(request, 'proteus_google_nonce'),
        ])
      },
    },
  },
})
