/**
 * Global app store (React context).
 *
 * Holds: boot/auth state, settings, profiles, running browser sessions,
 * toasts, and the selected profile id. All async mutations are exposed as
 * actions; components stay thin.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppInitState,
  AppSettings,
  BrowserStatusEvent,
  LaunchOptions,
  NewProfileInput,
  ProfileData,
  RunningSession
} from '@shared/types'

export interface Toast {
  id: number
  severity: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface AppState {
  booted: boolean
  init: AppInitState | null
  settings: AppSettings | null
  profiles: ProfileData[]
  running: Record<string, RunningSession>
  selectedId: string | null
  toasts: Toast[]
  busy: boolean
}

interface AppActions {
  setMasterPassword: (pw: string) => Promise<void>
  unlock: (pw: string) => Promise<void>
  lock: () => Promise<void>
  refreshProfiles: () => Promise<void>
  selectProfile: (id: string | null) => void
  createProfile: (input: NewProfileInput) => Promise<ProfileData>
  updateProfile: (id: string, patch: Partial<ProfileData>) => Promise<ProfileData>
  duplicateProfile: (id: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  launchProfile: (id: string, opts: LaunchOptions) => Promise<void>
  closeProfile: (id: string) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
  toast: (message: string, severity?: Toast['severity']) => void
  dismissToast: (id: number) => void
  setBusy: (busy: boolean) => void
}

const Ctx = createContext<AppState & AppActions>(null as unknown as AppState & AppActions)

let toastId = 0

export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [booted, setBooted] = useState(false)
  const [init, setInit] = useState<AppInitState | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [profiles, setProfiles] = useState<ProfileData[]>([])
  const [running, setRunning] = useState<Record<string, RunningSession>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [busy, setBusy] = useState(false)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId

  const toast = useCallback((message: string, severity: Toast['severity'] = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, severity, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const refreshProfiles = useCallback(async () => {
    const list = await window.stealth.listProfiles()
    setProfiles(list)
    if (selectedRef.current && !list.some((p) => p.id === selectedRef.current)) {
      setSelectedId(null)
    }
  }, [])

  const loadRunning = useCallback(async () => {
    const list = await window.stealth.listRunning()
    const map: Record<string, RunningSession> = {}
    for (const s of list) map[s.profileId] = s
    setRunning(map)
  }, [])

  // --- boot ----------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      try {
        // Verify the preload bridge exists
        if (!window.stealth) {
          throw new Error(
            'Preload bridge (window.stealth) is not available. ' +
            'The Electron preload script failed to load. ' +
            'Try reinstalling JoeBrowser.'
          )
        }
        const state = await window.stealth.init()
        setInit(state)
        if (state.unlocked) {
          const [s] = await Promise.all([window.stealth.getSettings(), refreshProfiles(), loadRunning()])
          setSettings(s)
        }
      } catch (e) {
        console.error('[JoeBrowser] Boot error:', e)
        toast(String(e), 'error')
      } finally {
        setBooted(true)
      }
    })()
  }, [refreshProfiles, loadRunning, toast])

  // --- browser status push events -------------------------------------------
  useEffect(() => {
    const off = window.stealth.onBrowserStatus((event: BrowserStatusEvent) => {
      if (event.status === 'running') {
        setRunning((prev) => ({
          ...prev,
          [event.profileId]: {
            profileId: event.profileId,
            pid: event.pid ?? 0,
            browserType: event.browserType ?? 'chrome',
            startedAt: event.startedAt ?? Date.now(),
            userDataDir: event.userDataDir ?? ''
          } as RunningSession
        }))
      } else if (event.status === 'exited' || event.status === 'error') {
        setRunning((prev) => {
          const next = { ...prev }
          delete next[event.profileId]
          return next
        })
        if (event.status === 'error') toast(event.error ?? 'Browser exited with an error', 'error')
      }
    })
    return off
  }, [toast])

  // --- auth actions -----------------------------------------------------------
  const setMasterPassword = useCallback(async (pw: string) => {
    await window.stealth.setMasterPassword(pw)
    const state = await window.stealth.init()
    setInit(state)
    const [s] = await Promise.all([window.stealth.getSettings(), refreshProfiles()])
    setSettings(s)
    toast('Master password created', 'success')
  }, [refreshProfiles, toast])

  const unlock = useCallback(async (pw: string) => {
    const ok = await window.stealth.unlock(pw)
    if (!ok) throw new Error('Wrong password')
    const state = await window.stealth.init()
    setInit(state)
    const [s] = await Promise.all([window.stealth.getSettings(), refreshProfiles(), loadRunning()])
    setSettings(s)
  }, [refreshProfiles, loadRunning])

  const lock = useCallback(async () => {
    await window.stealth.lock()
    setProfiles([])
    setRunning({})
    setSelectedId(null)
    setInit({ initialized: true, unlocked: false, version: init?.version ?? '', platform: init?.platform ?? '' })
  }, [init])

  // --- profile actions ---------------------------------------------------------
  const createProfile = useCallback(async (input: NewProfileInput) => {
    const profile = await window.stealth.createProfile(input)
    await refreshProfiles()
    setSelectedId(profile.id)
    return profile
  }, [refreshProfiles])

  const updateProfile = useCallback(async (id: string, patch: Partial<ProfileData>) => {
    const updated = await window.stealth.updateProfile(id, patch)
    setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }, [])

  const duplicateProfile = useCallback(async (id: string) => {
    const copy = await window.stealth.duplicateProfile(id)
    await refreshProfiles()
    setSelectedId(copy.id)
  }, [refreshProfiles])

  const deleteProfile = useCallback(async (id: string) => {
    await window.stealth.deleteProfile(id)
    await refreshProfiles()
  }, [refreshProfiles])

  const launchProfile = useCallback(async (id: string, opts: LaunchOptions) => {
    await window.stealth.launch(id, opts)
    await loadRunning()
  }, [loadRunning])

  const closeProfile = useCallback(async (id: string) => {
    await window.stealth.closeBrowser(id)
    await loadRunning()
  }, [loadRunning])

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await window.stealth.updateSettings(patch)
    setSettings(next)
    return next
  }, [])

  const value = useMemo<AppState & AppActions>(
    () => ({
      booted, init, settings, profiles, running, selectedId, toasts, busy,
      setMasterPassword, unlock, lock, refreshProfiles, selectProfile: setSelectedId,
      createProfile, updateProfile, duplicateProfile, deleteProfile,
      launchProfile, closeProfile, updateSettings, toast, dismissToast, setBusy
    }),
    [booted, init, settings, profiles, running, selectedId, toasts, busy,
      setMasterPassword, unlock, lock, refreshProfiles, createProfile, updateProfile,
      duplicateProfile, deleteProfile, launchProfile, closeProfile, updateSettings,
      toast, dismissToast]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState & AppActions {
  return useContext(Ctx)
}
