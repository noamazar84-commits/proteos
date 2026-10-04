import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers, whopWebhookEvents } from '../../db/schema'
import { rateLimit } from '../lib/server/security'
import { normalizeWhopEvent, verifyWhopSignature } from '../lib/server/whop'

function duplicateKey(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; errno?: unknown }
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062
}

export const Route = createFileRoute('/api/webhooks/payment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limited = rateLimit(request, 'whop-webhook', 120, 60_000)
        if (limited) return limited
        if (Number(request.headers.get('content-length') ?? 0) > 1_048_576) return new Response('Webhook body is too large', { status: 413 })
        const rawBody = await request.text()
        if (!verifyWhopSignature(rawBody, request.headers)) return new Response('Invalid Whop signature', { status: 401 })

        const webhookId = request.headers.get('webhook-id')
        const timestamp = request.headers.get('webhook-timestamp')
        if (!webhookId || !timestamp) return new Response('Missing webhook headers', { status: 400 })

        let payload: unknown
        try {
          payload = JSON.parse(rawBody)
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }
        const event = normalizeWhopEvent(payload, webhookId, timestamp)
        if (!event) return new Response('Invalid event payload', { status: 400 })

        const db = getDb()
        try {
          await db.transaction(async (tx) => {
            await tx.insert(whopWebhookEvents).values({
              webhookId: event.id,
              eventType: event.eventType,
              eventAt: event.eventAt,
            })

            if (event.kind === 'ignored') return
            let customer = null
            if (event.membershipId) {
              const [match] = await tx.select().from(customers).where(eq(customers.whopMembershipId, event.membershipId)).limit(1)
              customer = match ?? null
            }
            if (!customer && event.email) {
              const [match] = await tx.select().from(customers).where(eq(customers.email, event.email)).limit(1)
              customer = match ?? null
            }
            if (!customer) return
            if (customer.providerEventAt && customer.providerEventAt.getTime() > event.eventAt.getTime()) return

            const patch: Partial<typeof customers.$inferInsert> = { providerEventAt: event.eventAt }
            if (event.membershipId && (!customer.whopMembershipId || customer.whopMembershipId === event.membershipId)) {
              patch.whopMembershipId = event.membershipId
            }

            switch (event.kind) {
              case 'trial_started':
                patch.status = 'trialing'
                patch.subscriptionStartedAt = customer.subscriptionStartedAt ?? event.eventAt
                patch.trialStartedAt = event.trialStartedAt ?? event.eventAt
                patch.trialEndsAt = event.trialEndsAt ?? new Date(event.eventAt.getTime() + 7 * 86_400_000)
                patch.renewalDate = event.trialEndsAt ?? event.renewalDate ?? new Date(event.eventAt.getTime() + 7 * 86_400_000)
                patch.canceledAt = null
                patch.cancelAtPeriodEnd = false
                break
              case 'membership_active':
                patch.status = 'active'
                patch.subscriptionStartedAt = customer.subscriptionStartedAt ?? event.eventAt
                patch.renewalDate = event.renewalDate ?? customer.renewalDate
                patch.canceledAt = null
                patch.cancelAtPeriodEnd = false
                break
              case 'payment_succeeded':
                patch.status = 'active'
                patch.subscriptionStartedAt = customer.subscriptionStartedAt ?? event.eventAt
                patch.paymentDate = event.paymentDate ?? event.eventAt
                patch.renewalDate = event.renewalDate ?? customer.renewalDate
                if (event.amountPaidCents !== null) patch.amountPaidCents = event.amountPaidCents
                patch.canceledAt = null
                patch.cancelAtPeriodEnd = false
                break
              case 'payment_failed':
                patch.status = 'past_due'
                break
              case 'membership_canceled':
                patch.status = 'canceled'
                patch.canceledAt = event.eventAt
                patch.cancelAtPeriodEnd = false
                patch.renewalDate = null
                break
              case 'cancel_schedule_changed':
                if (event.cancelAtPeriodEnd !== null) {
                  patch.cancelAtPeriodEnd = event.cancelAtPeriodEnd
                  patch.canceledAt = event.cancelAtPeriodEnd ? event.eventAt : null
                }
                break
            }
            await tx.update(customers).set(patch).where(eq(customers.id, customer.id))
          })
          return Response.json({ received: true }, { headers: { 'cache-control': 'no-store' } })
        } catch (error) {
          if (duplicateKey(error)) return Response.json({ received: true, duplicate: true }, { headers: { 'cache-control': 'no-store' } })
          console.error('Whop webhook processing failed; provider may retry.')
          return Response.json({ error: 'Webhook could not be processed.' }, { status: 500 })
        }
      },
    },
  },
})
