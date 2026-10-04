import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SALT_BYTES = 16
const COST = 16_384
const BLOCK_SIZE = 8
const PARALLELIZATION = 1
const MAX_MEMORY = 32 * 1024 * 1024

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('base64url')
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  }).toString('base64url')
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt}$${hash}`
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, cost, blockSize, parallelization, salt, encodedHash] = encoded.split('$')
  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !encodedHash) return false
  const expected = Buffer.from(encodedHash, 'base64url')
  if (expected.length !== KEY_LENGTH) return false
  try {
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
      maxmem: MAX_MEMORY,
    })
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
