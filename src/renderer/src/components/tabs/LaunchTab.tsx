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

/** Launch tab: launch button, fingerprint test, running status. */
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
      toast.success(fingerprintTest ? 'Fingerprint test opened' : 'Browser launched')
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
      <SectionCard title="Launch" subtitle="Embedded browser session">
        <Stack spacing={2}>
          <TextField
            label="Start URL"
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
              sx={{ minWidth: 180 }}
            >
              {isRunning ? 'Running...' : 'Launch'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ScienceIcon />}
              disabled={launching || isRunning}
              onClick={() => void launch(true)}
            >
              FP Test
            </Button>
            {isRunning && (
              <Button
                variant="outlined"
                color="error"
                size="large"
                startIcon={<StopCircleIcon />}
                onClick={() => void close()}
              >
                Stop
              </Button>
            )}
          </Stack>
          <FormControlLabel
            control={<Switch checked={devtools} onChange={(e) => setDevtools(e.target.checked)} size="small" />}
            label="DevTools"
          />
        </Stack>
      </SectionCard>

      {/* Running status */}
      <SectionCard title="Status">
        {isRunning ? (
          <Stack spacing={1}>
            <Chip
              label="Running"
              color="success"
              variant="filled"
              sx={{ width: 'fit-content', fontWeight: 600 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              Started {new Date(session.startedAt).toLocaleTimeString()}
            </Typography>
            <Alert severity="info" sx={{ borderRadius: 2, py: 0 }}>
              <Typography variant="caption">Browser opens in a new window within the app. Close it to end the session.</Typography>
            </Alert>
          </Stack>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No active session.
          </Alert>
        )}
      </SectionCard>

      {/* Tips */}
      <SectionCard title="Tips">
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          1. Each profile has isolated storage (cookies, cache, IndexedDB).<br />
          2. Generate unique fingerprints per profile.<br />
          3. Set and test proxy before launch.<br />
          4. Use FP Test to verify fingerprint masking.
        </Typography>
      </SectionCard>
    </Box>
  )
}
