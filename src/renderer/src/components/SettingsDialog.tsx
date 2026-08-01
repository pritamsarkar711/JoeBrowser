import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import DownloadIcon from '@mui/icons-material/Download'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'

/** App-wide settings dialog. */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const { settings, updateSettings, lock } = useApp()
  const toastHook = useToast()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (open) {
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      setPwMsg(null)
    }
  }, [open])

  if (!settings) return <></>

  const lang = settings.language

  const changePassword = async (): Promise<void> => {
    setPwMsg(null)
    if (newPw.length < 6) {
      setPwMsg({ severity: 'error', text: 'Master password must be at least 6 characters.' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ severity: 'error', text: 'Passwords do not match.' })
      return
    }
    try {
      await window.stealth.changeMasterPassword(oldPw, newPw)
      setPwMsg({ severity: 'success', text: 'Master password changed.' })
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (e) {
      setPwMsg({ severity: 'error', text: String(e) })
    }
  }

  const pickDataDir = async (): Promise<void> => {
    const dir = await window.stealth.pickDirectory()
    if (!dir) return
    try {
      await updateSettings({ dataDir: dir })
      toastHook.success('Data directory changed. Old data was preserved.')
    } catch (e) {
      toastHook.error(String(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Theme & language */}
          <Box>
            <Typography variant="subtitle1"  sx={{ fontWeight: 600, mb: 1 }}>
              Appearance
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  label="Theme"
                  value={settings.theme}
                  onChange={(e) => void updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                >
                  <MenuItem value="system">System</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  label="Language"
                  value={lang}
                  onChange={(e) => void updateSettings({ language: e.target.value as string })}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="bn">বাংলা</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Data directory */}
          <Box>
            <Typography variant="subtitle1"  sx={{ fontWeight: 600, mb: 1 }}>
              Data directory
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                value={settings.dataDir || '(default: %APPDATA%/JoeBrowser)'}
                disabled
              />
              <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={() => void pickDataDir()}>
                Change
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              All profiles, fingerprints and the encrypted database live here. The previous directory is kept untouched.
            </Typography>
          </Box>

          {/* Behavior */}
          <Box>
            <Typography variant="subtitle1"  sx={{ fontWeight: 600, mb: 1 }}>
              Behavior
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.launchAtStartup}
                  onChange={(e) => void updateSettings({ launchAtStartup: e.target.checked })}
                />
              }
              label="Launch JoeBrowser on system start"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.closeBrowsersOnQuit}
                  onChange={(e) => void updateSettings({ closeBrowsersOnQuit: e.target.checked })}
                />
              }
              label="Close launched browsers when the app quits"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.minimizeToTray}
                  onChange={(e) => void updateSettings({ minimizeToTray: e.target.checked })}
                />
              }
              label="Minimize to system tray instead of quitting"
            />
          </Box>

          {/* Download / Updates */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Download & Updates
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Current version: v1.0.0 (from package.json). Check GitHub Releases for Windows .exe installer and portable builds.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={() => window.open('https://github.com/pritamsarkar711/JoeBrowser/releases', '_blank')}>
                  Releases
                </Button>
                <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open('https://github.com/pritamsarkar711/JoeBrowser/actions/workflows/build-windows.yml', '_blank')}>
                  CI Builds
                </Button>
                <Button size="small" variant="text" onClick={() => window.open('https://github.com/pritamsarkar711/JoeBrowser/archive/refs/heads/main.zip', '_blank')}>
                  Source ZIP
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Tip: On Windows, double-click <code>scripts/build-windows.bat</code> to build the EXE locally in ~3 minutes (npm run dist:win).
              </Typography>
            </Stack>
          </Box>

          <Divider />

          {/* Master password */}
          <Box>
            <Typography variant="subtitle1"  sx={{ fontWeight: 600, mb: 1 }}>
              Master password
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                label="Current password"
                type="password"
                size="small"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
              />
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="New password"
                  type="password"
                  size="small"
                  fullWidth
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  size="small"
                  fullWidth
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
              </Stack>
              {pwMsg && <Alert severity={pwMsg.severity}>{pwMsg.text}</Alert>}
              <Box>
                <Button variant="outlined" onClick={() => void changePassword()}>
                  Change master password
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => void lock()}>
          Lock app
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
