import { createFileRoute } from '@tanstack/react-router'
import { integrations } from '../lib/integrations'
import { sendContactEmail } from '../lib/server/email'
import { hasTrustedOrigin, rateLimit } from '../lib/server/security'
import { hasSameOrigin } from '../lib/server/session'

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export const Route = createFileRoute('/api/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasSameOrigin(request) || !hasTrustedOrigin(request)) return Response.json({ error: 'Request origin could not be verified.' }, { status: 403 })
        const limited = rateLimit(request, 'contact', 5, 15 * 60_000)
        if (limited) return limited
        if (Number(request.headers.get('content-length') ?? 0) > 12_000) return Response.json({ error: 'Message is too large.' }, { status: 413 })
        const body = await request.json().catch(() => null) as Record<string, unknown> | null
        const name = text(body?.name, 100)
        const email = text(body?.email, 320).toLowerCase()
        const message = text(body?.message, 4000)
        if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) return Response.json({ error: 'Enter your name, a valid email address, and a message.' }, { status: 400 })
        const delivered = await sendContactEmail({ to: integrations.admin.email, replyTo: email, name, message })
        if (!delivered) return Response.json({ error: 'The contact service is not configured yet. Please try again later.' }, { status: 503 })
        return Response.json({ sent: true, message: 'Thanks — your message has been sent.' }, { headers: { 'cache-control': 'no-store' } })
      },
    },
  },
})
