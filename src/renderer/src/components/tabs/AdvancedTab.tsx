import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import type { ProfileData } from '@shared/types'
import { SectionCard } from '../SectionCard'
import { useToast } from '../../hooks/useToasts'

/** Advanced tab: executable, flags, extra extensions, overrides. */
export function AdvancedTab({
  profile,
  setProfile
}: {
  profile: ProfileData
  setProfile: (patch: Partial<ProfileData>) => void
}): React.JSX.Element {
  const toast = useToast()
  const [detected, setDetected] = useState<string>('')
  const [tagsInput, setTagsInput] = useState((profile.tags ?? []).join(', '))

  useEffect(() => {
    setTagsInput((profile.tags ?? []).join(', '))
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickExecutable = async (): Promise<void> => {
    const path = await window.stealth.pickFile([
      { name: 'Browser executable', extensions: ['exe', 'app', 'bin', '*'] }
    ])
    if (path) {
      setProfile({ browserExecutablePath: path })
      toast.success('Executable path set')
    }
  }

  const runDetect = async (): Promise<void> => {
    try {
      const browsers = await window.stealth.detectBrowsers()
      const b = browsers.find((x) => x.type === profile.browserType)
      setDetected(b?.found ? b.path : 'Not found on this system')
    } catch (e) {
      setDetected(String(e))
    }
  }

  const addExtension = async (): Promise<void> => {
    const path = await window.stealth.pickFile([
      { name: 'Extension (.crx / .xpi / unpacked dir)', extensions: ['crx', 'xpi'] }
    ])
    if (!path) return
    if (path.endsWith('.crx') || path.endsWith('.xpi')) {
      toast.info('Note: only unpacked directories can be loaded via --load-extension; .crx/.xpi paths are stored for reference.')
    }
    setProfile({ customExtensions: [...(profile.customExtensions ?? []), path] })
  }

  return (
    <Box>
      {/* General */}
      <SectionCard title="General" subtitle="Name, tags and notes (stored encrypted)">
        <Stack spacing={2}>
          <TextField
            label="Profile name"
            size="small"
            fullWidth
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
          />
          <TextField
            label="Tags (comma-separated)"
            size="small"
            fullWidth
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={() =>
              setProfile({ tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean) })
            }
          />
          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={profile.notes}
            onChange={(e) => setProfile({ notes: e.target.value })}
          />
        </Stack>
      </SectionCard>

      {/* Executable */}
      <SectionCard title="Browser executable" subtitle="Empty = auto-detect from the system">
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              value={profile.browserExecutablePath}
              onChange={(e) => setProfile({ browserExecutablePath: e.target.value })}
              placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
            />
            <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={() => void pickExecutable()}>
              Browse…
            </Button>
            <Button variant="outlined" onClick={() => void runDetect()}>
              Detect
            </Button>
          </Stack>
          {detected && (
            <Typography variant="caption" color="text.secondary">
              Detected: {detected}
            </Typography>
          )}
        </Stack>
      </SectionCard>

      {/* Launch flags */}
      <SectionCard title="Extra launch arguments" subtitle="Appended to the browser command line (one per line)">
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          value={profile.extraLaunchArgs}
          onChange={(e) => setProfile({ extraLaunchArgs: e.target.value })}
          placeholder={'--disable-blink-features=AutomationControlled\n--window-position=100,100'}
          helperText="Chromium flags are passed as-is; Firefox flags too (both are per-profile)."
        />
      </SectionCard>

      {/* Extra extensions */}
      <SectionCard title="Custom extensions" subtitle="Additional local extensions loaded into this profile">
        <Stack spacing={1}>
          {(profile.customExtensions ?? []).map((ext, i) => (
            <Chip
              key={i}
              label={ext}
              onDelete={() =>
                setProfile({ customExtensions: (profile.customExtensions ?? []).filter((_, j) => j !== i) })
              }
              variant="outlined"
            />
          ))}
          <Box>
            <Button variant="outlined" onClick={() => void addExtension()}>
              Add extension…
            </Button>
          </Box>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Unpacked extension directories are loaded with <code>--load-extension</code>. Firefox .xpi files can be
            referenced here but must be placed manually (see README).
          </Alert>
        </Stack>
      </SectionCard>

      {/* Data isolation */}
      <SectionCard title="Data isolation" subtitle="Each profile has its own user data directory">
        <Stack spacing={1.5}>
          <TextField
            label="User data directory override (empty = app-managed)"
            size="small"
            fullWidth
            value={profile.userDataDirOverride}
            onChange={(e) => setProfile({ userDataDirOverride: e.target.value })}
            placeholder="D:\profile-data\my-account"
          />
          <Typography variant="body2" color="text.secondary">
            Default: <code>{'<data dir>/profiles/' + profile.id + '/userData'}</code>
          </Typography>
        </Stack>
      </SectionCard>

      <SectionCard title="Fingerprint engine">
        <Stack spacing={1.5}>
          <FormControlLabel
            control={
              <Switch
                checked={profile.fingerprintsAuto}
                onChange={(e) => setProfile({ fingerprintsAuto: e.target.checked })}
              />
            }
            label="Auto-generate a fingerprint for new sessions"
          />
          <Typography variant="body2" color="text.secondary">
            The stealth extension is rebuilt locally on every launch with this profile's values — no data ever
            leaves your machine.
          </Typography>
        </Stack>
      </SectionCard>
    </Box>
  )
}
