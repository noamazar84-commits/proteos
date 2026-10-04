import { createHash } from 'node:crypto'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.VERIFICATION_FROM_EMAIL?.trim()
  const appOrigin = process.env.PUBLIC_APP_ORIGIN?.trim()
  if (!apiKey || !from || !appOrigin) return false

  let verificationUrl: URL
  try {
    verificationUrl = new URL('/api/auth/verify-email', appOrigin)
    verificationUrl.searchParams.set('token', token)
  } catch {
    return false
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Verify your Proteus email',
        text: `Verify your Proteus account by opening this link: ${verificationUrl.toString()}\n\nThis link expires in 30 minutes and can only be used once.`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function sendAdminLoginCode(email: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.VERIFICATION_FROM_EMAIL?.trim()
  if (!apiKey || !from) return false
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Your Proteus admin login code',
        text: `Your Proteus admin login code is ${code}. It expires in 10 minutes and can only be used once. If you did not request this code, ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function sendContactEmail(input: { to: string; replyTo: string; name: string; message: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.VERIFICATION_FROM_EMAIL?.trim()
  if (!apiKey || !from) return false
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: input.replyTo,
        subject: `Proteus contact message from ${input.name}`,
        text: `Name: ${input.name}\nEmail: ${input.replyTo}\n\n${input.message}`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    return response.ok
  } catch {
    return false
  }
}
