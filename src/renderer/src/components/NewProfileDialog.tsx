import { useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import type { BrowserType, DeviceType, TargetOS } from '@shared/types'
import { BROWSER_LABELS } from '@shared/types'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'

const OS_OPTIONS: Array<{ value: TargetOS; label: string }> = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' }
]

const DEVICE_OPTIONS: Array<{ value: DeviceType; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' }
]

/** "New profile" dialog: name, browser engine, OS, device, auto-fingerprint toggle. */
export function NewProfileDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}): React.JSX.Element {
  const { createProfile } = useApp()
  const toast = useToast()
  const [name, setName] = useState('')
  const [browserType, setBrowserType] = useState<BrowserType>('chrome')
  const [targetOs, setTargetOs] = useState<TargetOS>('windows')
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [fingerprintsAuto, setFingerprintsAuto] = useState(true)
  const [busy, setBusy] = useState(false)

  // Auto-set device type when OS changes (mobile OS → mobile device)
  const handleOsChange = (os: TargetOS): void => {
    setTargetOs(os)
    if (os === 'android' || os === 'ios') {
      setDeviceType('mobile')
    }
  }

  const submit = async (): Promise<void> => {
    if (!name.trim()) {
      toast.error('Give the profile a name.')
      return
    }
    setBusy(true)
    try {
      const profile = await createProfile({
        name,
        browserType,
        tags: [],
        fingerprintsAuto
      })
      toast.success('Profile created')
      onCreated(profile.id)
      setName('')
      onClose()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New profile</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            label="Profile name"
            autoFocus
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
          <Stack direction="row" spacing={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>Browser engine</InputLabel>
              <Select label="Browser engine" value={browserType} onChange={(e) => setBrowserType(e.target.value as BrowserType)}>
                {(Object.keys(BROWSER_LABELS) as BrowserType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {BROWSER_LABELS[t]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>OS</InputLabel>
              <Select label="OS" value={targetOs} onChange={(e) => handleOsChange(e.target.value as TargetOS)}>
                {OS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <FormControl size="small" fullWidth>
            <InputLabel>Device type</InputLabel>
            <Select label="Device type" value={deviceType} onChange={(e) => setDeviceType(e.target.value as DeviceType)}>
              {DEVICE_OPTIONS.map((d) => (
                <MenuItem key={d.value} value={d.value}>
                  {d.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={fingerprintsAuto}
                onChange={(e) => setFingerprintsAuto(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Auto-generate realistic fingerprint
              </Typography>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy} onClick={() => void submit()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
