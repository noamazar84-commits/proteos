import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { getDb } from '../../../db'
import { customers, userSessions } from '../../../db/schema'
import type { User } from '../store'

export const SESSION_COOKIE = 'proteus_session'
export const GOOGLE_NONCE_COOKIE = 'proteus_google_nonce'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=')
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(entry.slice(separator + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

export function cookieHeader(request: Request, name: string, value: string, maxAgeSeconds: number): string {
  const requestUrl = new URL(request.url)
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  const secure = forwardedProto === 'https' || requestUrl.protocol === 'https:'
  const sameSite = secure ? 'None' : 'Lax'
  const partitioned = secure ? '; Secure; Partitioned' : ''
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}${partitioned}`
}

export function clearCookieHeader(request: Request, name: string): string {
  return cookieHeader(request, name, '', 0)
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const previewOrigin = new URL(origin)
    // The managed Preview is a cross-site iframe; its origin is still controlled by Manus.
    if (previewOrigin.hostname.endsWith('.manus.computer')) return true
    const requestUrl = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const targetHost = (forwardedHost || request.headers.get('host') || requestUrl.host).toLowerCase()
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
    const targetProto = forwardedProto || requestUrl.protocol.slice(0, -1)
    const originUrl = new URL(origin)
    return originUrl.host.toLowerCase() === targetHost && originUrl.protocol === `${targetProto}:`
  } catch {
    return false
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(customerId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await getDb().insert(userSessions).values({
    sessionHash: hashToken(token),
    customerId,
    expiresAt,
  })
  return { token, expiresAt }
}

export async function revokeSession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return
  await getDb().delete(userSessions).where(eq(userSessions.sessionHash, hashToken(token)))
}

export async function getSessionCustomer(request: Request) {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null
  const [customer] = await getDb()
    .select({
      id: customers.id,
      googleSub: customers.googleSub,
      email: customers.email,
      emailVerified: customers.emailVerified,
      name: customers.name,
      givenName: customers.givenName,
      familyName: customers.familyName,
      pictureUrl: customers.pictureUrl,
      pathway: customers.pathway,
      createdAt: customers.createdAt,
    })
    .from(userSessions)
    .innerJoin(customers, eq(userSessions.customerId, customers.id))
    .where(and(eq(userSessions.sessionHash, hashToken(token)), gt(userSessions.expiresAt, new Date())))
    .limit(1)
  return customer ?? null
}

export type SessionCustomer = NonNullable<Awaited<ReturnType<typeof getSessionCustomer>>>

export function toPublicUser(customer: SessionCustomer): User {
  const pathway = customer.pathway === 'glp1' || customer.pathway === 'bariatric' || customer.pathway === 'general'
    ? customer.pathway
    : null
  return {
    id: customer.id,
    email: customer.email,
    emailVerified: customer.emailVerified,
    name: customer.name,
    provider: customer.googleSub ? 'google' : 'password',
    pictureUrl: customer.pictureUrl,
    pathway,
    createdAt: customer.createdAt.toISOString(),
  }
}
