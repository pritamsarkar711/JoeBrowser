import { useMemo, useState, useEffect } from 'react'
import { Box, Typography, useMediaQuery, CssBaseline, ThemeProvider, Button, Paper, Stack, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FavoriteIcon from '@mui/icons-material/Favorite'
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

  useEffect(() => {
    if (booted) return
    const timer = setTimeout(() => {
      if (!booted) {
        setBootTimeout(true)
        setBootError(
          'Joe Browser is taking longer than expected.\n\n' +
          'Try: Close all Joe Browser processes, then relaunch.'
        )
      }
    }, 30000)
    return () => clearTimeout(timer)
  }, [booted])

  if (booted && !init) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Paper elevation={3} sx={{ maxWidth: 520, p: 4, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main', mb: 2 }}>
              Failed to initialize
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Try reinstalling or deleting %APPDATA%/JoeBrowser
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload
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
                Startup Timeout
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 3, color: 'text.secondary' }}>
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
          <Typography color="text.secondary">Starting Joe Browser...</Typography>
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
                gap: 2,
                p: 4,
                textAlign: 'center'
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 28,
                  letterSpacing: '-1px',
                  boxShadow: '0 4px 20px rgba(103,80,164,0.4)',
                  mb: 1
                }}
              >
                JB
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {profiles.length === 0 ? 'Joe Browser' : 'Select a profile'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, fontSize: 13 }}>
                {profiles.length === 0
                  ? 'Create your first profile to start browsing with fingerprint protection.'
                  : 'Pick a profile from the sidebar, or create a new one.'}
              </Typography>
              {profiles.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setNewProfileOpen(true)}
                  sx={{ borderRadius: 6, px: 3, py: 1, fontWeight: 600, fontSize: 14, mt: 1 }}
                >
                  New profile
                </Button>
              )}

              <Divider sx={{ width: 200, my: 2 }} />

              {/* About section */}
              <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Joe Browser v{init.version ?? 'dev'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  Built with <FavoriteIcon sx={{ fontSize: 10, color: '#e91e63' }} /> by{' '}
                  <Box
                    component="a"
                    href="https://t.me/joegoldberg2025"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                  >
                    Joe Goldberg
                  </Box>
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      <NewProfileDialog open={newProfileOpen} onClose={() => setNewProfileOpen(false)} onCreated={(id) => { selectProfile(id) }} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DownloadDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} />
      <Toasts />
      <LoadingOverlay open={busy} label="Launching..." />
    </ThemeProvider>
  )
}
