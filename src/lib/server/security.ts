const buckets = new Map<string, { count: number; resetAt: number }>()
const MAX_BUCKETS = 10_000

function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('cf-connecting-ip')?.trim() || 'unknown'
}

function cleanup(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  if (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value
    if (oldest) buckets.delete(oldest)
  }
}

/** Lightweight per-process guard; deploys should add an edge/managed limiter for multi-instance enforcement. */
export function rateLimit(request: Request, scope: string, limit: number, windowMs: number, identity = ''): Response | null {
  const now = Date.now()
  cleanup(now)
  const key = `${scope}:${clientAddress(request)}:${identity.slice(0, 160)}`
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  existing.count += 1
  if (existing.count <= limit) return null
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'cache-control': 'no-store, max-age=0', 'retry-after': String(retryAfter) } },
  )
}

/** Reject cross-site browser requests while allowing non-browser health and local tooling requests without Origin. */
export function hasTrustedOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase()
  if (fetchSite === 'cross-site') return false
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const requestUrl = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
    const targetHost = (forwardedHost || request.headers.get('host') || requestUrl.host).toLowerCase()
    const targetProto = forwardedProto || requestUrl.protocol.slice(0, -1)
    const originUrl = new URL(origin)
    return originUrl.host.toLowerCase() === targetHost && originUrl.protocol === `${targetProto}:`
  } catch {
    return false
  }
}

export function addSecurityHeaders(headers: Headers): Headers {
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(self)')
  headers.set('cross-origin-opener-policy', 'same-origin-allow-popups')
  return headers
}
