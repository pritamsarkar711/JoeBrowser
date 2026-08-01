import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import type { ProfileData } from '@shared/types'
import { SectionCard } from '../SectionCard'
import { useToast } from '../../hooks/useToasts'

/** Known dangerous Chromium flags. */
const DANGEROUS_ARGS = [
  '--disable-web-security',
  '--disable-same-origin',
  '--allow-file-access-from-files',
  '--allow-running-insecure-content',
  '--ignore-certificate-errors',
  '--disable-extensions',
  '--no-sandbox'
]

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
  const [tagInput, setTagInput] = useState('')
  const tags = profile.tags ?? []

  useEffect(() => {
    setTagInput('')
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

  const addUnpackedExtension = async (): Promise<void> => {
    const dir = await window.stealth.pickDirectory()
    if (!dir) return
    setProfile({ customExtensions: [...(profile.customExtensions ?? []), dir] })
    toast.success('Unpacked extension directory added')
  }

  const addTag = (): void => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setProfile({ tags: [...tags, t] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string): void => {
    setProfile({ tags: tags.filter((t) => t !== tag) })
  }

  // Check launch args for dangerous flags
  const launchArgs = (profile.extraLaunchArgs ?? '').split('\n').filter(Boolean)
  const dangerousArgs = launchArgs.filter((arg) => DANGEROUS_ARGS.some((d) => arg.trim().startsWith(d)))

  return (
    <Box>
      {/* General */}
      <SectionCard title="General" subtitle="Name, tags, notes">
        <Stack spacing={1.5}>
          <TextField
            label="Profile name"
            size="small"
            fullWidth
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
          />
          {/* Tags as chips */}
          <Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 0.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => removeTag(tag)}
                  variant="outlined"
                  sx={{ height: 24, fontSize: 12 }}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <TextField
                size="small"
                fullWidth
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag…"
              />
              <IconButton size="small" onClick={addTag} disabled={!tagInput.trim()}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
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
      <SectionCard title="Browser executable" subtitle="Auto-detect if empty">
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              value={profile.browserExecutablePath}
              onChange={(e) => setProfile({ browserExecutablePath: e.target.value })}
              placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
            />
            <Button size="small" variant="outlined" startIcon={<FolderOpenIcon />} onClick={() => void pickExecutable()}>
              Browse
            </Button>
            <Button size="small" variant="outlined" onClick={() => void runDetect()}>
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
      <SectionCard title="Extra launch arguments" subtitle="Per-line flags">
        <Stack spacing={1}>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={profile.extraLaunchArgs}
            onChange={(e) => setProfile({ extraLaunchArgs: e.target.value })}
            placeholder={'--disable-blink-features=AutomationControlled\n--window-position=100,100'}
          />
          {dangerousArgs.length > 0 && (
            <Alert
              severity="warning"
              icon={<WarningAmberIcon />}
              sx={{ borderRadius: 2, py: 0 }}
            >
              <Typography variant="caption">
                <b>Dangerous flags detected:</b> {dangerousArgs.join(', ')} — these may compromise security or fingerprint isolation.
              </Typography>
            </Alert>
          )}
        </Stack>
      </SectionCard>

      {/* Extra extensions — better display */}
      <SectionCard title="Custom extensions" subtitle="Extensions">
        <Stack spacing={1}>
          {(profile.customExtensions ?? []).length > 0 && (
            <Box sx={{ maxHeight: 120, overflowY: 'auto' }}>
              <Stack spacing={0.5}>
                {(profile.customExtensions ?? []).map((ext, i) => (
                  <Chip
                    key={i}
                    label={ext}
                    onDelete={() =>
                      setProfile({ customExtensions: (profile.customExtensions ?? []).filter((_, j) => j !== i) })
                    }
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: 11, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  />
                ))}
              </Stack>
            </Box>
          )}
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => void addExtension()}>
              Add .crx/.xpi…
            </Button>
            <Button size="small" variant="outlined" startIcon={<FolderOpenIcon />} onClick={() => void addUnpackedExtension()}>
              Add unpacked…
            </Button>
          </Stack>
          <Alert severity="info" sx={{ borderRadius: 2, py: 0 }}>
            <Typography variant="caption">
              Unpacked dirs are loaded with <code>--load-extension</code>. Firefox .xpi files must be placed manually.
            </Typography>
          </Alert>
        </Stack>
      </SectionCard>

      {/* Data isolation */}
      <SectionCard title="Data isolation" subtitle="Data folder">
        <Stack spacing={1}>
          <TextField
            label="User data dir override (empty = app-managed)"
            size="small"
            fullWidth
            value={profile.userDataDirOverride}
            onChange={(e) => setProfile({ userDataDirOverride: e.target.value })}
            placeholder="D:\profile-data\my-account"
          />
          <Typography variant="caption" color="text.secondary">
            Default: <code>{'<data dir>/profiles/' + profile.id + '/userData'}</code>
          </Typography>
        </Stack>
      </SectionCard>

      <SectionCard title="Fingerprint engine & anti-automation">
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={profile.fingerprintsAuto}
                onChange={(e) => setProfile({ fingerprintsAuto: e.target.checked })}
                size="small"
              />
            }
            label="Auto-generate fingerprint for new sessions"
          />
          <FormControlLabel
            control={
              <Switch
                checked={profile.disableAutomationFlags !== false}
                onChange={(e) => setProfile({ disableAutomationFlags: e.target.checked })}
                size="small"
              />
            }
            label="Disable automation flags"
          />
          <Typography variant="caption" color="text.secondary">
            The stealth extension is rebuilt locally on every launch — no data leaves your machine.
          </Typography>
        </Stack>
      </SectionCard>
    </Box>
  )
}
