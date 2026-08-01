import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material'
import type { BrowserType, DeviceType, TargetOS } from '@shared/types'
import { BROWSER_NAMES, BROWSER_LABELS } from '@shared/types'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'
import { BrowserIcon } from './BrowserIcon'

const OS_OPTIONS: Array<{ value: TargetOS; label: string }> = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' }
]

const DEVICE_OPTIONS: Array<{ value: DeviceType; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' }
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (id: string) => void
}

export function NewProfileDialog({ open, onClose, onCreated }: Props): React.JSX.Element {
  const { createProfile } = useApp()
  const toast = useToast()
  const [name, setName] = useState('')
  const [browserType, setBrowserType] = useState<BrowserType>('chrome')
  const [targetOs, setTargetOs] = useState<TargetOS>('windows')
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [fingerprintsAuto, setFingerprintsAuto] = useState(true)

  const submit = async (): Promise<void> => {
    if (!name.trim()) {
      toast.error('Enter a profile name')
      return
    }
    try {
      const created = await createProfile({
        name: name.trim(),
        browserType,
        tags: [],
        fingerprintsAuto,
        os: targetOs,
        device: deviceType
      })
      toast.success('Profile created')
      onCreated?.(created.id)
      setName('')
      setBrowserType('chrome')
      setTargetOs('windows')
      setDeviceType('desktop')
      setFingerprintsAuto(true)
      onClose()
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>New Profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Profile Name"
            size="small"
            fullWidth
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            placeholder="My Profile"
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Browser</InputLabel>
            <Select
              label="Browser"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value as BrowserType)}
            >
              {BROWSER_NAMES.map((b) => (
                <MenuItem key={b} value={b}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <BrowserIcon type={b} size={18} />
                    <span>{BROWSER_LABELS[b]}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>OS</InputLabel>
              <Select
                label="OS"
                value={targetOs}
                onChange={(e) => {
                  const os = e.target.value as TargetOS
                  setTargetOs(os)
                  if (os === 'android' || os === 'ios') {
                    setDeviceType('mobile')
                  } else {
                    setDeviceType('desktop')
                  }
                }}
              >
                {OS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Device</InputLabel>
              <Select
                label="Device"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
              >
                {DEVICE_OPTIONS.map((d) => (
                  <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={fingerprintsAuto}
                onChange={(e) => setFingerprintsAuto(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                Auto-generate fingerprint
              </Typography>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()}>Create</Button>
      </DialogActions>
    </Dialog>
  )
}
