import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import ScienceIcon from '@mui/icons-material/Science'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import type { ProfileData } from '@shared/types'
import { SectionCard } from '../SectionCard'
import { useApp } from '../../store'
import { useToast } from '../../hooks/useToasts'

/** Launch tab: big launch button, fingerprint test, running status. */
export function LaunchTab({ profile }: { profile: ProfileData }): React.JSX.Element {
  const { launchProfile, closeProfile, running, setBusy } = useApp()
  const toast = useToast()
  const [url, setUrl] = useState(profile.launchUrl)
  const [devtools, setDevtools] = useState(false)
  const [launching, setLaunching] = useState(false)

  const session = running[profile.id]
  const isRunning = !!session

  const launch = async (fingerprintTest: boolean): Promise<void> => {
    setLaunching(true)
    setBusy(true)
    try {
      await launchProfile(profile.id, {
        url: fingerprintTest ? undefined : url.trim() || undefined,
        devtools,
        fingerprintTest
      })
      toast.success(fingerprintTest ? 'Opened fingerprint test page' : 'Browser launched')
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLaunching(false)
      setBusy(false)
    }
  }

  const close = async (): Promise<void> => {
    try {
      await closeProfile(profile.id)
      toast.success('Browser closed')
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <Box>
      {/* Launch controls */}
      <SectionCard title="Launch profile" subtitle="Isolated browser session">
        <Stack spacing={2}>
          <TextField
            label="Open URL after launch (optional)"
            size="small"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={launching ? <CircularProgress size={18} color="inherit" /> : <RocketLaunchIcon />}
              disabled={launching || isRunning}
              onClick={() => void launch(false)}
              sx={{ minWidth: 200 }}
            >
              {isRunning ? 'Running…' : 'Launch profile'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ScienceIcon />}
              disabled={launching || isRunning}
              onClick={() => void launch(true)}
            >
              Fingerprint test
            </Button>
            {isRunning && (
              <Button
                variant="outlined"
                color="error"
                size="large"
                startIcon={<StopCircleIcon />}
                onClick={() => void close()}
              >
                Close browser
              </Button>
            )}
          </Stack>
          <FormControlLabel
            control={<Switch checked={devtools} onChange={(e) => setDevtools(e.target.checked)} />}
            label="Launch with DevTools open"
          />
        </Stack>
      </SectionCard>

      {/* Running status */}
      <SectionCard title="Session status">
        {isRunning ? (
          <Stack spacing={1}>
            <Chip
              label={`Running · PID ${session.pid}`}
              color="success"
              variant="filled"
              sx={{ width: 'fit-content', fontWeight: 600 }}
            />
            <Typography variant="body2" color="text.secondary">
              Started {new Date(session.startedAt).toLocaleTimeString()} · user data:{' '}
              <code>{session.userDataDir || 'app-managed'}</code>
            </Typography>
            <Alert severity="info" sx={{ borderRadius: 2, py: 0 }}>
              <Typography variant="caption">Closing the browser window ends the session and removes the stealth extension.</Typography>
            </Alert>
          </Stack>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No active session for this profile.
          </Alert>
        )}
      </SectionCard>

      {/* Quick hints */}
      <SectionCard title="Multi-accounting checklist">
        <Typography variant="body2" color="text.secondary">
          1. Each profile has isolated storage — cookies, cache, and IndexedDB stay separate. <br />
          2. Generate a unique fingerprint per profile. <br />
          3. Set a proxy per profile and test before launch. <br />
          4. Verify with the fingerprint test page before real browsing.
        </Typography>
      </SectionCard>
    </Box>
  )
}
