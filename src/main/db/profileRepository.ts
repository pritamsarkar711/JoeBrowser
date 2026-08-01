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
