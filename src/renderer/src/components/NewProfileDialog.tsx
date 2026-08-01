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
import type { BrowserType } from '@shared/types'
import { BROWSER_LABELS } from '@shared/types'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'

/** "New profile" dialog: name, browser engine, auto-fingerprint toggle. */
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
  const [fingerprintsAuto, setFingerprintsAuto] = useState(true)
  const [busy, setBusy] = useState(false)

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
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Profile name"
            autoFocus
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
          <FormControl fullWidth>
            <InputLabel>Browser engine</InputLabel>
            <Select label="Browser engine" value={browserType} onChange={(e) => setBrowserType(e.target.value as BrowserType)}>
              {(Object.keys(BROWSER_LABELS) as BrowserType[]).map((t) => (
                <MenuItem key={t} value={t}>
                  {BROWSER_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={fingerprintsAuto}
                onChange={(e) => setFingerprintsAuto(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                Auto-generate a realistic fingerprint on creation
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
