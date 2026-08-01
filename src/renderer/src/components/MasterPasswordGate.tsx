import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import { useApp } from '../store'
import { t } from '../i18n'

/**
 * First-run & lock gate. Two modes:
 *  - create: brand-new install — user picks the master password
 *  - unlock: existing install — user enters it
 */
export function MasterPasswordGate({ mode }: { mode: 'create' | 'unlock' }): React.JSX.Element {
  const { setMasterPassword, unlock, settings } = useApp()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lang = settings?.language ?? 'en'

  const submit = async (): Promise<void> => {
    setError('')
    if (password.length < 6) {
      setError('Master password must be at least 6 characters.')
      return
    }
    if (mode === 'create' && password !== confirm) {
      setError(t('auth.mismatch', undefined, lang))
      return
    }
    setBusy(true)
    try {
      if (mode === 'create') await setMasterPassword(password)
      else await unlock(password)
    } catch (e) {
      setError(t('auth.wrong', undefined, lang))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 'min(420px, 100%)',
          p: 4,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}
        >
          {mode === 'create' ? <VpnKeyOutlinedIcon fontSize="large" /> : <LockOutlinedIcon fontSize="large" />}
        </Box>
        <Typography variant="h5"  gutterBottom sx={{ fontWeight: 700 }}>
          {t('app.name', undefined, lang)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {mode === 'create' ? t('auth.createTitle', undefined, lang) : t('auth.unlockTitle', undefined, lang)}
        </Typography>

        {mode === 'create' && (
          <Alert severity="info" sx={{ mb: 2, textAlign: 'left', borderRadius: 2 }}>
            {t('auth.createHint', undefined, lang)}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label={t('auth.password', undefined, lang)}
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            autoFocus
          />
          {mode === 'create' && (
            <TextField
              label={t('auth.confirm', undefined, lang)}
              type="password"
              fullWidth
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
          )}
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <Button variant="contained" size="large" disabled={busy} onClick={() => void submit()}>
            {mode === 'create' ? t('auth.create', undefined, lang) : t('auth.submit', undefined, lang)}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
