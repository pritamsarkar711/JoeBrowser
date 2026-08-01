import { useMemo, useState } from 'react'
import { Box, Typography, useMediaQuery, CssBaseline, ThemeProvider } from '@mui/material'
import { darkTheme, lightTheme } from './theme'
import { useApp } from './store'
import { MasterPasswordGate } from './components/MasterPasswordGate'
import { Sidebar } from './components/Sidebar'
import { ProfileEditor } from './components/ProfileEditor'
import { NewProfileDialog } from './components/NewProfileDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Toasts } from './components/Toasts'
import { LoadingOverlay } from './components/LoadingOverlay'

const SIDEBAR_WIDTH = 300

export default function App(): React.JSX.Element {
  const { booted, init, settings, profiles, selectedId, busy } = useApp()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const theme = useMemo(() => {
    const mode = settings?.theme ?? 'system'
    return mode === 'light' || (mode === 'system' && !prefersDark) ? lightTheme : darkTheme
  }, [settings?.theme, prefersDark])

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null

  // --- boot / auth gates -----------------------------------------------------
  if (!booted || !init) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">Starting StealthBrowser…</Typography>
        </Box>
      </ThemeProvider>
    )
  }

  if (!init.initialized) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <MasterPasswordGate mode="create" />
      </ThemeProvider>
    )
  }

  if (!init.unlocked) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MasterPasswordGate mode="unlock" />
      </ThemeProvider>
    )
  }

  // --- main app ---------------------------------------------------------------
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          width={SIDEBAR_WIDTH}
          onNewProfile={() => setNewProfileOpen(true)}
          onSettings={() => setSettingsOpen(true)}
        />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {selectedProfile ? (
            <ProfileEditor key={selectedProfile.id} profile={selectedProfile} />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                p: 4,
                textAlign: 'center'
              }}
            >
              <Typography variant="h5"  sx={{ fontWeight: 700 }}>
                {profiles.length === 0 ? 'Welcome to StealthBrowser' : 'Select a profile'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
                {profiles.length === 0
                  ? 'Create your first isolated browsing profile. Everything stays on this machine — fingerprints, proxies and browser data are yours only.'
                  : 'Pick a profile from the sidebar, or create a new one.'}
              </Typography>
              {profiles.length === 0 && (
                <Box sx={{ mt: 2 }}>
                  <button
                    onClick={() => setNewProfileOpen(true)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 24,
                      border: 'none',
                      background: '#6750a4',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + New profile
                  </button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <NewProfileDialog open={newProfileOpen} onClose={() => setNewProfileOpen(false)} onCreated={() => undefined} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toasts />
      <LoadingOverlay open={busy} label="Launching profile…" />
    </ThemeProvider>
  )
}
