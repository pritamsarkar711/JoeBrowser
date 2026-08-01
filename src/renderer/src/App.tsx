import { useState } from 'react'
import { Box, CircularProgress, Drawer, Typography, useMediaQuery } from '@mui/material'
import { ThemeProvider, useTheme } from '@mui/material/styles'
import { lightTheme, darkTheme } from './theme'
import { useApp } from './store'
import { MasterPasswordGate } from './components/MasterPasswordGate'
import { Sidebar } from './components/Sidebar'
import { ProfileEditor } from './components/ProfileEditor'
import { NewProfileDialog } from './components/NewProfileDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { DownloadDialog } from './components/DownloadDialog'
import { Toasts } from './components/Toasts'
import { ErrorBoundary } from './components/ErrorBoundary'

function AppInner(): React.JSX.Element {
  const { booted, init, profiles, selectedId } = useApp()
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [mobileDrawer, setMobileDrawer] = useState(false)

  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))

  const selectedProfile = profiles.find((p) => p.id === selectedId)

  const sidebar = (
    <Sidebar
      onNewProfile={() => setNewProfileOpen(true)}
      onSettings={() => setSettingsOpen(true)}
      onDownload={() => setDownloadOpen(true)}
      onMobileClose={() => setMobileDrawer(false)}
    />
  )

  // ── Loading state ──
  if (!booted) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">Loading Joe Browser...</Typography>
      </Box>
    )
  }

  // ── Auth gate ──
  if (!init?.unlocked) {
    return <MasterPasswordGate mode={init?.initialized ? 'unlock' : 'create'} />
  }

  // ── Main UI ──
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile drawer */}
      {isNarrow && (
        <Drawer
          variant="temporary"
          open={mobileDrawer}
          onClose={() => setMobileDrawer(false)}
          sx={{ '& .MuiDrawer-paper': { width: 260 } }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* Desktop sidebar */}
      {!isNarrow && sidebar}

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 1.5, sm: 2, md: 3 },
          minWidth: 0,
        }}
      >
        {selectedProfile ? (
          <ProfileEditor profile={selectedProfile} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 1.5 }}>
            <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="jb-empty" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#5B5FC7" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="22" fill="url(#jb-empty)" opacity="0.2"/>
              <circle cx="24" cy="24" r="8" fill="url(#jb-empty)" opacity="0.4"/>
            </svg>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
              Joe Browser
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
              Select a profile or create a new one
            </Typography>
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      <NewProfileDialog open={newProfileOpen} onClose={() => setNewProfileOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DownloadDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} />
      <Toasts />
    </Box>
  )
}

export default function App(): React.JSX.Element {
  const { settings } = useApp()
  const theme = settings?.theme ?? 'system'
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const useDark = theme === 'dark' || (theme === 'system' && prefersDark)

  return (
    <ThemeProvider theme={useDark ? darkTheme : lightTheme}>
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
