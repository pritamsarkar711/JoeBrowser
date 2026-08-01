/**
 * High-level profile CRUD on top of the encrypted database.
 * Also handles filesystem cleanup (user data dirs) on delete.
 */
import { rmSync } from 'node:fs'
import * as db from './database'
import * as paths from '../paths'
import { logger } from '../logger'
import { randomId, createNewProfile, type NewProfileInput, type ProfileData } from '@shared/types'

export function listProfiles(): ProfileData[] {
  return db.listProfiles()
}

export function getProfile(id: string): ProfileData | null {
  return db.getProfile(id)
}

export function createProfile(input: NewProfileInput): ProfileData {
  const profile = createNewProfile(input)
  // Ensure the user-data folder exists up front so launch is fast.
  paths.ensureDirs()
  db.insertProfile(profile)
  logger.info('Created profile', profile.id, profile.name)
  return profile
}

export function updateProfile(id: string, patch: Partial<ProfileData>): ProfileData {
  const existing = db.getProfile(id)
  if (!existing) throw new Error('Profile not found: ' + id)
  const updated: ProfileData = { ...existing, ...patch, id, updatedAt: Date.now() }
  db.updateProfile(updated)
  return updated
}

export function duplicateProfile(id: string): ProfileData {
  const existing = db.getProfile(id)
  if (!existing) throw new Error('Profile not found: ' + id)
  const copy: ProfileData = {
    ...JSON.parse(JSON.stringify(existing)),
    id: randomId(),
    name: existing.name + ' (copy)',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastLaunchedAt: null,
    tags: [...existing.tags]
  }
  db.insertProfile(copy)
  logger.info('Duplicated profile', id, '->', copy.id)
  return copy
}

export function deleteProfile(id: string): void {
  // Refuse to delete the last profile only if it is the ONLY one — actually
  // allow deleting all profiles; the app handles the empty state gracefully.
  db.deleteProfile(id)
  const dir = paths.profileDir(id)
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch (e) {
    logger.warn('Could not remove profile folder', dir, e)
  }
  logger.info('Deleted profile', id)
}

/** Records a launch timestamp (kept out of the fingerprint payload). */
export function touchLastLaunched(id: string): void {
  const existing = db.getProfile(id)
  if (!existing) return
  db.updateProfile({ ...existing, lastLaunchedAt: Date.now(), updatedAt: existing.updatedAt })
}

/**
 * Export a profile as an encrypted JSON envelope (AES-256-GCM with a
 * password-derived key). The file is useless without the export password.
 */
export function exportProfileEncrypted(id: string, password: string): string {
  const profile = db.getProfile(id)
  if (!profile) throw new Error('Profile not found: ' + id)
  if (!password || password.length < 4) throw new Error('Export password must be at least 4 characters.')

  // Lazy import to keep the repository free of circular crypto deps at module load.
  const { randomBytes } = require('node:crypto') as typeof import('node:crypto')
  const { deriveKey, aesGcmEncrypt, KEY_LEN } = require('../crypto/cipher') as typeof import('../crypto/cipher')

  const salt = randomBytes(16)
  const key = deriveKey(password, salt)
  // Strip runtime-only fields before packaging.
  const payload = {
    ...profile,
    lastLaunchedAt: null
  }
  const wrapped = aesGcmEncrypt(key, JSON.stringify(payload))
  return JSON.stringify(
    {
      format: 'stealthbrowser-profile-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      name: profile.name,
      browserType: profile.browserType,
      salt: salt.toString('hex'),
      iterations: 250_000,
      keyLen: KEY_LEN,
      payload: wrapped
    },
    null,
    2
  )
}

/** Import a profile from an encrypted export envelope. */
export function importProfileEncrypted(json: string, password: string): ProfileData {
  let envelope: {
    format?: string
    version?: number
    salt?: string
    payload?: { iv: string; tag: string; data: string }
  }
  try {
    envelope = JSON.parse(json)
  } catch {
    throw new Error('Invalid export file (not JSON).')
  }
  if (envelope.format !== 'stealthbrowser-profile-export' || !envelope.salt || !envelope.payload) {
    throw new Error('Unrecognized export format.')
  }
  if (!password) throw new Error('Import password is required.')

  const { deriveKey, aesGcmDecrypt } = require('../crypto/cipher') as typeof import('../crypto/cipher')
  const key = deriveKey(password, Buffer.from(envelope.salt, 'hex'))
  let plain: string
  try {
    plain = aesGcmDecrypt(key, envelope.payload).toString('utf-8')
  } catch {
    throw new Error('Wrong password or corrupted export file.')
  }
  const data = JSON.parse(plain) as ProfileData
  const imported: ProfileData = {
    ...data,
    id: randomId(),
    name: (data.name || 'Imported') + ' (imported)',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastLaunchedAt: null,
    tags: Array.isArray(data.tags) ? [...data.tags] : []
  }
  db.insertProfile(imported)
  logger.info('Imported profile', imported.id, imported.name)
  return imported
}
