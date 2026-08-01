import { useMemo, useState, useEffect } from 'react'
import { Box, Typography, useMediaQuery, CssBaseline, ThemeProvider, Button, Paper } from '@mui/material'
import { darkTheme, lightTheme } from './theme'
import { useApp } from './store'
import { MasterPasswordGate } from './components/MasterPasswordGate'
import { Sidebar } from './components/Sidebar'
import { ProfileEditor } from './components/ProfileEditor'
import { NewProfileDialog } from './components/NewProfileDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { DownloadDialog } from './components/DownloadDialog'
import { Toasts } from './components/Toasts'
import { LoadingOverlay } from './components/LoadingOverlay'

const SIDEBAR_WIDTH = 260

export default function App(): React.JSX.Element {
  const { booted, init, settings, profiles, selectedId, selectProfile, busy } = useApp()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const isNarrow = useMediaQuery('(max-width:900px)')
  const isCompact = useMediaQuery('(max-width:1100px)')
  const sidebarWidth = isCompact && !isNarrow ? 220 : SIDEBAR_WIDTH
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bootTimeout, setBootTimeout] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const theme = useMemo(() => {
    const mode = settings?.theme ?? 'system'
    return mode === 'light' || (mode === 'system' && !prefersDark) ? lightTheme : darkTheme
  }, [settings?.theme, prefersDark])

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null

  // Startup health check: if boot takes >15s, show a diagnostic screen instead
  // of hanging forever on "Starting JoeBrowser…"
  useEffect(() => {
    if (booted) return
    const timer = setTimeout(() => {
      if (!booted) {
        setBootTimeout(true)
        setBootError(
          'Joe Browser is taking longer than expected to start.\n\n' +
          'This usually means one of the following:\n' +
          '• The native SQLite module failed to load (reinstall the app)\n' +
          '• Windows Defender / antivirus is blocking the app\n' +
          '• Another instance is already running (check the system tray)\n' +
          '• The data directory is locked or permissions are denied\n\n' +
          'Try: Close all Joe Browser processes in Task Manager, then relaunch.\n' +
          'If this persists, reinstall from the Releases page or run "npm run dist:win".'
        )
      }
    }, 30000)
    return () => clearTimeout(timer)
  }, [booted])

  // --- boot / auth gates -----------------------------------------------------
  // BUG FIX: If booted is true but init is null, the IPC call failed — show
  // an error instead of hanging on "Starting JoeBrowser…" forever.
  if (booted && !init) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Paper elevation={3} sx={{ maxWidth: 520, p: 4, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main', mb: 2 }}>
              ⚠ Failed to initialize
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Joe Browser started but the initialization IPC call failed. This can happen if:
              {'\n\n'}• The native SQLite module failed to load
              {'\n'}• The data directory is inaccessible
              {'\n'}• The Electron preload bridge is broken
              {'\n\n'}Try reinstalling or deleting the data folder at:
              {'\n'}%APPDATA%/JoeBrowser
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </Paper>
        </Box>
      </ThemeProvider>
    )
  }

  if (!booted || !init) {
    if (bootTimeout) {
      return (
        <ThemeProvider theme={lightTheme}>
          <CssBaseline />
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Paper elevation={3} sx={{ maxWidth: 520, p: 4, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main', mb: 2 }}>
                ⚠ Startup Timeout
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-line', mb: 3, color: 'text.secondary' }}
              >
                {bootError}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={() => window.location.reload()}>
                  Reload
                </Button>
                <Button variant="outlined" onClick={() => window.close()}>
                  Close
                </Button>
              </Box>
            </Paper>
          </Box>
        </ThemeProvider>
      )
    }

    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">Starting Joe Browser…</Typography>
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
          width={sidebarWidth}
          onNewProfile={() => setNewProfileOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onDownload={() => setDownloadOpen(true)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onMobileOpen={() => setMobileOpen(true)}
        />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            // Leave room for the mobile top bar hamburger.
            pt: isNarrow ? '52px' : 0
          }}
        >
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {profiles.length === 0 ? 'Welcome to Joe Browser' : 'Select a profile'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
                {profiles.length === 0
                  ? 'Create your first profile. All data stays local.'
                  : 'Pick a profile from the sidebar, or create a new one.'}
              </Typography>
              {profiles.length === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setNewProfileOpen(true)}
                    sx={{ borderRadius: 6, px: 3, py: 1, fontWeight: 600, fontSize: 15 }}
                  >
                    + New profile
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <NewProfileDialog open={newProfileOpen} onClose={() => setNewProfileOpen(false)} onCreated={(id) => { selectProfile(id) }} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DownloadDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} />
      <Toasts />
      <LoadingOverlay open={busy} label="Launching profile…" />
    </ThemeProvider>
  )
}
