import { useCallback, useEffect, useState } from 'react'
import type { ProfileData } from '@shared/types'

/**
 * Local draft management for the profile editor: load a profile into a
 * draft, mutate it freely, then save() pushes the whole object.
 */
export function useProfileDraft(profile: ProfileData | null): {
  draft: ProfileData | null
  setDraft: (patch: Partial<ProfileData>) => void
  replaceDraft: (p: ProfileData) => void
  dirty: boolean
  save: () => Promise<ProfileData | null>
  reset: () => void
} {
  const [draft, setDraftState] = useState<ProfileData | null>(null)
  const [base, setBase] = useState<string>('')

  useEffect(() => {
    if (profile) {
      setDraftState(JSON.parse(JSON.stringify(profile)) as ProfileData)
      setBase(JSON.stringify(profile))
    } else {
      setDraftState(null)
      setBase('')
    }
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const setDraft = useCallback((patch: Partial<ProfileData>) => {
    setDraftState((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const replaceDraft = useCallback((p: ProfileData) => {
    setDraftState(p)
  }, [])

  const dirty = useCallback((): boolean => {
    return !!draft && JSON.stringify(draft) !== base
  }, [draft, base])

  const save = useCallback(async (): Promise<ProfileData | null> => {
    if (!draft) return null
    const saved = await window.stealth.updateProfile(draft.id, draft)
    setBase(JSON.stringify(saved))
    return saved
  }, [draft])

  const reset = useCallback(() => {
    if (profile) {
      setDraftState(JSON.parse(JSON.stringify(profile)) as ProfileData)
      setBase(JSON.stringify(profile))
    }
  }, [profile])

  return { draft, setDraft, replaceDraft, dirty: dirty(), save, reset }
}
