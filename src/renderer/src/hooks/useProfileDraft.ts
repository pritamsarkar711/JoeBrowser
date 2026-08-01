import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProfileData } from '@shared/types'

/**
 * Local draft management for the profile editor: load a profile into a
 * draft, mutate it freely. Changes are auto-saved to the encrypted DB via a
 * debounced IPC call (600 ms). save() forces an immediate flush.
 */
export function useProfileDraft(
  profile: ProfileData | null,
  opts?: { onAutoSaved?: (p: ProfileData) => void; onAutoSaveError?: (e: unknown) => void }
): {
  draft: ProfileData | null
  setDraft: (patch: Partial<ProfileData>) => void
  replaceDraft: (p: ProfileData) => void
  dirty: boolean
  saving: boolean
  save: () => Promise<ProfileData | null>
  reset: () => void
} {
  const [draft, setDraftState] = useState<ProfileData | null>(null)
  const [base, setBase] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRef = useRef<ProfileData | null>(null)
  const baseRef = useRef('')
  const optsRef = useRef(opts)
  optsRef.current = opts
  draftRef.current = draft
  baseRef.current = base

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (profile) {
      const clone = JSON.parse(JSON.stringify(profile)) as ProfileData
      setDraftState(clone)
      setBase(JSON.stringify(profile))
    } else {
      setDraftState(null)
      setBase('')
    }
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async (): Promise<ProfileData | null> => {
    const current = draftRef.current
    if (!current) return null
    if (JSON.stringify(current) === baseRef.current) return current
    setSaving(true)
    try {
      const saved = await window.stealth.updateProfile(current.id, current)
      setBase(JSON.stringify(saved))
      setDraftState(saved)
      optsRef.current?.onAutoSaved?.(saved)
      return saved
    } catch (e) {
      optsRef.current?.onAutoSaveError?.(e)
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  const scheduleAutoSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flush().catch(() => {
        /* surfaced via onAutoSaveError */
      })
    }, 600)
  }, [flush])

  // Flush pending saves on unmount.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const setDraft = useCallback(
    (patch: Partial<ProfileData>) => {
      setDraftState((prev) => {
        if (!prev) return prev
        return { ...prev, ...patch }
      })
      scheduleAutoSave()
    },
    [scheduleAutoSave]
  )

  const replaceDraft = useCallback((p: ProfileData) => {
    if (timer.current) clearTimeout(timer.current)
    setDraftState(p)
    setBase(JSON.stringify(p))
  }, [])

  const dirty = !!draft && JSON.stringify(draft) !== base

  const save = useCallback(async (): Promise<ProfileData | null> => {
    if (timer.current) clearTimeout(timer.current)
    return flush()
  }, [flush])

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (profile) {
      setDraftState(JSON.parse(JSON.stringify(profile)) as ProfileData)
      setBase(JSON.stringify(profile))
    }
  }, [profile])

  return { draft, setDraft, replaceDraft, dirty, saving, save, reset }
}
