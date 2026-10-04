import { and, eq, gt, isNull } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers, emailVerificationTokens } from '../../db/schema'
import { hashVerificationToken } from '../lib/server/email'
import { rateLimit } from '../lib/server/security'

const NO_CACHE = { 'cache-control': 'no-store, max-age=0' }

export const Route = createFileRoute('/api/auth/verify-email')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limited = rateLimit(request, 'auth-email-verify', 20, 15 * 60_000)
        if (limited) return limited
        const token = new URL(request.url).searchParams.get('token')?.trim() ?? ''
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
          return Response.json({ error: 'This verification link is invalid or expired.' }, { status: 400, headers: NO_CACHE })
        }

        const [record] = await getDb()
          .select({ tokenHash: emailVerificationTokens.tokenHash, customerId: emailVerificationTokens.customerId })
          .from(emailVerificationTokens)
          .where(and(
            eq(emailVerificationTokens.tokenHash, hashVerificationToken(token)),
            isNull(emailVerificationTokens.usedAt),
            gt(emailVerificationTokens.expiresAt, new Date()),
          ))
          .limit(1)
        if (!record) return Response.json({ error: 'This verification link is invalid or expired.' }, { status: 400, headers: NO_CACHE })

        await getDb().transaction(async (tx) => {
          await tx.update(customers).set({ emailVerified: true }).where(eq(customers.id, record.customerId))
          await tx.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.tokenHash, record.tokenHash))
        })
        return Response.json({ verified: true, message: 'Email verified. You can now sign in.' }, { headers: NO_CACHE })
      },
    },
  },
})
