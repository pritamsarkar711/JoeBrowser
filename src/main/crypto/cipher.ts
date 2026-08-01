/**
 * Pure crypto primitives (Node crypto module only — no native deps).
 *
 * - PBKDF2-SHA256 derives a key-encryption key from the master password.
 * - AES-256-GCM encrypts/decrypts payloads (authenticated).
 * - The database key is a random 32-byte key that is WRAPPED with the
 *   master-password-derived key and stored in master.key. This means:
 *     * rotating the master password only re-wraps the DB key (fast),
 *     * the DB file is useless without the master password,
 *     * "forgot password" = data is irrecoverably gone (by design).
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  pbkdf2,
  pbkdf2Sync,
  randomBytes,
  randomInt
} from 'node:crypto'

export const KEY_LEN = 32
export const PBKDF2_ITERATIONS = 250_000
export const VERIFIER = 'stealthbrowser.key.verifier.v1'

export interface EncryptedPayload {
  iv: string
  tag: string
  data: string
}

export function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString('hex')
}

export function randomInt32(): number {
  return randomInt(0, 0xffffffff)
}

/** Synchronous key derivation — blocks the thread. Kept for backward compatibility. */
export function deriveKey(password: string, salt: Buffer, iterations = PBKDF2_ITERATIONS): Buffer {
  return pbkdf2Sync(password, salt, iterations, KEY_LEN, 'sha256')
}

/** Asynchronous key derivation — yields the event loop so the main thread
 *  is not blocked during the expensive PBKDF2 computation (250k iterations).
 *  Preferred for all new code; use the sync version only when you must
 *  return a value synchronously (e.g. during initial unlock). */
export function deriveKeyAsync(password: string, salt: Buffer, iterations = PBKDF2_ITERATIONS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, iterations, KEY_LEN, 'sha256', (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

export function aesGcmEncrypt(key: Buffer, plaintext: string | Buffer): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
}

export function aesGcmDecrypt(key: Buffer, payload: EncryptedPayload): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()])
}

export function encryptJson(key: Buffer, value: unknown): Buffer {
  return Buffer.from(JSON.stringify(aesGcmEncrypt(key, JSON.stringify(value))), 'utf-8')
}

export function decryptJson<T>(key: Buffer, blob: Buffer): T {
  const payload = JSON.parse(blob.toString('utf-8')) as EncryptedPayload
  const plain = aesGcmDecrypt(key, payload).toString('utf-8')
  return JSON.parse(plain) as T
}

/** Constant-time-ish verifier so unlock can fail fast without touching the DB. */
export function makeVerifier(key: Buffer): string {
  return createHmac('sha256', key).update(VERIFIER).digest('hex')
}

export function verifyKey(key: Buffer, expected: string): boolean {
  const actual = createHmac('sha256', key).update(VERIFIER).digest('hex')
  const a = Buffer.from(actual, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
