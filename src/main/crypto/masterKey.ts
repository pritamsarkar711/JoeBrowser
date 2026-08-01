/**
 * Master password lifecycle.
 *
 * State machine:
 *   not initialized  -> setMasterPassword()   -> locked
 *   locked           -> unlock()              -> unlocked (DB key cached in memory)
 *   unlocked         -> changeMasterPassword() -> locked
 *
 * The master password NEVER touches disk. Only the wrapped DB key does.
 */
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import * as paths from '../paths'
import { logger } from '../logger'
import {
  KEY_LEN,
  PBKDF2_ITERATIONS,
  aesGcmDecrypt,
  aesGcmEncrypt,
  deriveKey,
  makeVerifier,
  verifyKey,
  type EncryptedPayload
} from './cipher'

interface MasterKeyFile {
  version: 1
  salt: string
  iterations: number
  verifier: string
  /** AES-256-GCM wrapped DB key. */
  wrapped: EncryptedPayload
}

let dbKey: Buffer | null = null

function keyFilePath(): string {
  return paths.masterKeyFile()
}

export function isInitialized(): boolean {
  return existsSync(keyFilePath())
}

export function isUnlocked(): boolean {
  return dbKey !== null
}

export function lock(): void {
  dbKey = null
}

function wrapDbKey(password: string, key: Buffer): MasterKeyFile {
  const salt = randomBytes(16)
  const masterKey = deriveKey(password, salt)
  return {
    version: 1,
    salt: salt.toString('hex'),
    iterations: PBKDF2_ITERATIONS,
    verifier: makeVerifier(masterKey),
    wrapped: aesGcmEncrypt(masterKey, key)
  }
}

/**
 * First-launch: create the master key file from a new password.
 * Throws if already initialized.
 */
export function setMasterPassword(password: string): void {
  if (isInitialized()) {
    throw new Error('Master password is already set.')
  }
  if (password.length < 6) {
    throw new Error('Master password must be at least 6 characters.')
  }
  const key = randomBytes(KEY_LEN) // random DB key
  const file = wrapDbKey(password, key)
  paths.ensureDirs()
  // Atomic-ish write: write temp then rename.
  const tmp = keyFilePath() + '.tmp'
  writeFileSync(tmp, JSON.stringify(file), 'utf-8')
  renameSync(tmp, keyFilePath())
  dbKey = key
  logger.info('Master password initialized')
}

/** Unlock with the master password. Returns true on success. */
export function unlock(password: string): boolean {
  if (!isInitialized()) throw new Error('Master password was never set.')
  const raw = readFileSync(keyFilePath(), 'utf-8')
  const file = JSON.parse(raw) as MasterKeyFile
  const masterKey = deriveKey(password, Buffer.from(file.salt, 'hex'), file.iterations)
  if (!verifyKey(masterKey, file.verifier)) return false
  try {
    dbKey = aesGcmDecrypt(masterKey, file.wrapped)
  } catch {
    dbKey = null
    return false
  }
  logger.info('Unlocked')
  return true
}

/** Change password: re-wrap the same DB key. Throws on wrong old password. */
export function changeMasterPassword(oldPassword: string, newPassword: string): void {
  if (newPassword.length < 6) {
    throw new Error('Master password must be at least 6 characters.')
  }
  if (!unlock(oldPassword)) {
    throw new Error('Current master password is incorrect.')
  }
  const key = dbKey as Buffer
  const file = wrapDbKey(newPassword, key)
  writeFileSync(keyFilePath(), JSON.stringify(file), 'utf-8')
  logger.info('Master password changed')
}

/** The in-memory DB key. Throws when locked. */
export function getDbKey(): Buffer {
  if (!dbKey) throw new Error('App is locked. Enter the master password first.')
  return dbKey
}
