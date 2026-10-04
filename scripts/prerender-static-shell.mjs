import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import app from '../dist/server/server.js'

const response = await app.fetch(new Request('http://static-build.local/'))
if (!response.ok) {
  throw new Error(`Static shell render failed with HTTP ${response.status}`)
}

const contentType = response.headers.get('content-type') ?? ''
if (!contentType.includes('text/html')) {
  throw new Error(`Static shell render returned unexpected content type: ${contentType}`)
}

const html = await response.text()
if (!/^<!doctype html/i.test(html) || !html.includes('/assets/')) {
  throw new Error('Static shell render did not produce the expected HTML document and asset references')
}

const outputPath = resolve('dist/client/index.html')
await mkdir(resolve('dist/client'), { recursive: true })
await writeFile(outputPath, html, 'utf8')
console.log(`Wrote static shell: ${outputPath} (${Buffer.byteLength(html)} bytes)`)
