import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

/**
 * The Netlify plugin boots a Deno-based edge-functions runtime, which only
 * exists on Netlify's build machines and in `netlify dev`. On any other host
 * (for example the Manus sandbox preview) loading it kills both the dev server
 * and the production build, so it is opt-in:
 *   - Netlify CI sets NETLIFY=true itself, so deploys keep working unchanged.
 *   - Locally, set USE_NETLIFY=true (or run `netlify dev`) to emulate Netlify.
 */
const useNetlify = process.env.NETLIFY === 'true' || process.env.USE_NETLIFY === 'true'

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    ...(useNetlify ? [netlify()] : []),
  tanstackStart(),
  viteReact(),
],
  server: {
    allowedHosts: ['.sg2.manus.computer'],
  },
})

export default config
