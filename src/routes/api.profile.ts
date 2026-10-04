import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db'
import { customers } from '../../db/schema'
import { rateLimit } from '../lib/server/security'
import { getSessionCustomer, hasSameOrigin } from '../lib/server/session'

const pathways = new Set(['glp1', 'bariatric', 'general'])
const activities = new Set(['low', 'moderate', 'high'])

export const Route = createFileRoute('/api/profile')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const origin = request.headers.get('origin')
        const previewOrigin = origin ? (() => { try { return new URL(origin).hostname.endsWith('.manus.computer') } catch { return false } })() : false
        if (!hasSameOrigin(request) && !previewOrigin) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'profile-write', 30, 60_000)
        if (limited) return limited
        if (Number(request.headers.get('content-length') ?? 0) > 10_000) return Response.json({ error: 'Request payload is too large.' }, { status: 413 })
        const customer = await getSessionCustomer(request)
        if (!customer?.emailVerified) return Response.json({ error: 'Verified sign-in required.' }, { status: 401 })
        const body = await request.json().catch(() => null) as Record<string, unknown> | null
        const pathway = body?.pathway
        const currentWeightKg = body?.currentWeightKg
        const goalWeightKg = body?.goalWeightKg
        const activity = body?.activity
        if (
          typeof pathway !== 'string' || !pathways.has(pathway) ||
          typeof currentWeightKg !== 'number' || !Number.isInteger(currentWeightKg) || currentWeightKg < 40 || currentWeightKg > 180 ||
          typeof goalWeightKg !== 'number' || !Number.isInteger(goalWeightKg) || goalWeightKg < 40 || goalWeightKg > 180 || goalWeightKg >= currentWeightKg ||
          typeof activity !== 'string' || !activities.has(activity)
        ) {
          return Response.json({ error: 'Choose a valid pathway, weight, goal, and activity level.' }, { status: 400 })
        }
        await getDb().update(customers).set({
          pathway,
          currentWeightKg,
          goalWeightKg,
          activity,
        }).where(eq(customers.id, customer.id))
        return Response.json({ saved: true }, { headers: { 'cache-control': 'no-store, max-age=0' } })
      },
    },
  },
})
