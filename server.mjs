import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import app from './dist/server/server.js'

const port = Number(process.env.PORT || 3000)
const MAX_REQUEST_BYTES = 1_048_576
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`)
}

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
])

function firstHeader(value) {
  return Array.isArray(value) ? value[0] : value
}

function toFetchRequest(incoming) {
  const host = firstHeader(incoming.headers.host) || `127.0.0.1:${port}`
  const forwardedProtocol = (firstHeader(incoming.headers['x-forwarded-proto']) || 'http').split(',')[0].trim()
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http'
  const url = new URL(incoming.url || '/', `${protocol}://${host}`)
  const headers = new Headers()

  for (const [name, value] of Object.entries(incoming.headers)) {
    if (!value || hopByHopHeaders.has(name.toLowerCase())) continue
    headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }

  const method = (incoming.method || 'GET').toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(incoming)
  return new Request(url, {
    method,
    headers,
    body,
    ...(body ? { duplex: 'half' } : {}),
  })
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const contentLength = Number(firstHeader(incoming.headers['content-length']) || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      outgoing.writeHead(413, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      outgoing.end(JSON.stringify({ error: 'Request body is too large.' }))
      return
    }
    const requestUrl = new URL(incoming.url || '/', `http://${firstHeader(incoming.headers.host) || `127.0.0.1:${port}`}`)
    if (requestUrl.pathname === '/_app/health') {
      outgoing.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      outgoing.end('ok')
      return
    }

    const request = toFetchRequest(incoming)
    const response = await app.fetch(request)
    const headers = Object.fromEntries(response.headers.entries())
    headers['x-content-type-options'] = 'nosniff'
    headers['referrer-policy'] = 'strict-origin-when-cross-origin'
    headers['permissions-policy'] = 'camera=(), microphone=(), geolocation=(), payment=(self)'
    headers['cross-origin-opener-policy'] = 'same-origin-allow-popups'
    const cookies = response.headers.getSetCookie?.() ?? []
    if (cookies.length) headers['set-cookie'] = cookies
    outgoing.writeHead(response.status, headers)

    if (incoming.method === 'HEAD' || !response.body) {
      outgoing.end()
      return
    }

    Readable.fromWeb(response.body).on('error', (error) => {
      console.error('Response stream failed.')
      outgoing.destroy(error)
    }).pipe(outgoing)
  } catch (error) {
    console.error('Request handler failed.')
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      outgoing.end('Internal Server Error')
    } else {
      outgoing.destroy(error)
    }
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Proteus server listening on 0.0.0.0:${port}`)
})
