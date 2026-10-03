import { defineConfig } from 'drizzle-kit'

const url = process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL ?? ''

export default defineConfig({
  dialect: 'mysql',
  schema: './db/schema.ts',
  out: './db/migrations',
  dbCredentials: { url },
})
