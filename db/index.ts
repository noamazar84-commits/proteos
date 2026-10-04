import { drizzle } from 'drizzle-orm/mysql2'
import { createPool } from 'mysql2/promise'
import * as schema from './schema'

const createDb = () => {
  const url = process.env.DATABASE_URL ?? process.env.DRIZZLE_DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set. Enable the Webdev managed database to persist customer and billing records.')
  }
  return drizzle({ client: createPool(url), schema, mode: 'default' })
}

export type Db = ReturnType<typeof createDb>
let client: Db | null = null

export function getDb(): Db {
  if (!client) client = createDb()
  return client
}
