import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPool } from 'mysql2/promise'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = resolve(here, '../db/migrations')
const databaseUrl = process.env.DATABASE_URL ?? process.env.DRIZZLE_DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set; cannot initialize Proteus customer storage.')
}

const pool = createPool(databaseUrl)
let connection

try {
  connection = await pool.getConnection()
  await connection.query(`
    CREATE TABLE IF NOT EXISTS proteus_schema_migrations (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()
  for (const file of files) {
    const [applied] = await connection.execute(
      'SELECT id FROM proteus_schema_migrations WHERE id = ? LIMIT 1',
      [file],
    )
    if (Array.isArray(applied) && applied.length > 0) continue

    const sql = await readFile(resolve(migrationsDir, file), 'utf8')
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) await connection.query(statement)
    await connection.execute('INSERT INTO proteus_schema_migrations (id) VALUES (?)', [file])
    console.log(`Applied database migration ${file}`)
  }

  console.log('Proteus database schema is ready.')
} finally {
  connection?.release()
  await pool.end()
}
