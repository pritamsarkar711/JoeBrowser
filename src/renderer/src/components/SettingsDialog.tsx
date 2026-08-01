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
  FormControlLabel,
  Paper
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import DownloadIcon from '@mui/icons-material/Download'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'

/** Settings dialog. */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const { settings, updateSettings, lock, init } = useApp()
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
      setPwMsg({ severity: 'error', text: 'Min 6 characters' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ severity: 'error', text: 'Passwords do not match' })
      return
    }
    try {
      await window.stealth.changeMasterPassword(oldPw, newPw)
      setPwMsg({ severity: 'success', text: 'Password changed' })
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
      toastHook.success('Data directory changed')
    } catch (e) {
      toastHook.error(String(e))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Theme & language */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}>
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
                  <MenuItem value="hi">हिन्दी</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Data directory */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}>
              Data
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                value={settings.dataDir || '(default)'}
                disabled
              />
              <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={() => void pickDataDir()} size="small">
                Change
              </Button>
            </Stack>
          </Box>

          {/* Behavior */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}>
              Behavior
            </Typography>
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.launchAtStartup}
                    onChange={(e) => void updateSettings({ launchAtStartup: e.target.checked })}
                    size="small"
                  />
                }
                label="Launch on startup"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.closeBrowsersOnQuit}
                    onChange={(e) => void updateSettings({ closeBrowsersOnQuit: e.target.checked })}
                    size="small"
                  />
                }
                label="Close browsers on quit"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.minimizeToTray}
                    onChange={(e) => void updateSettings({ minimizeToTray: e.target.checked })}
                    size="small"
                  />
                }
                label="Minimize to tray"
              />
            </Stack>
          </Box>

          {/* Updates */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}>
              Updates
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={() => window.stealth.openPath('https://github.com/pritamsarkar711/JoeBrowser/releases')}>
                Releases
              </Button>
              <Button size="small" variant="outlined" onClick={() => window.stealth.openPath('https://github.com/pritamsarkar711/JoeBrowser')}>
                GitHub
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* About */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}>
              About
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18,
                  mx: 'auto',
                  mb: 1,
                  boxShadow: '0 2px 8px rgba(103,80,164,0.3)'
                }}
              >
                JB
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14 }}>
                Joe Browser
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                v{init?.version ?? 'dev'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
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
            </Paper>
          </Box>

          <Divider />

          {/* Master password */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}>
              Master password
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                label="Current"
                type="password"
                size="small"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
              />
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="New"
                  type="password"
                  size="small"
                  fullWidth
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                <TextField
                  label="Confirm"
                  type="password"
                  size="small"
                  fullWidth
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
              </Stack>
              {pwMsg && <Alert severity={pwMsg.severity} sx={{ py: 0 }}>{pwMsg.text}</Alert>}
              <Button variant="outlined" size="small" onClick={() => void changePassword()}>
                Change password
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => void lock()}>
          Lock
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
