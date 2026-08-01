import { Alert, Snackbar, Stack } from '@mui/material'
import { useApp } from '../store'

/** Toast notifications (bottom center, stacked, auto-dismissing). */
export function Toasts(): React.JSX.Element {
  const { toasts, dismissToast } = useApp()
  return (
    <Stack spacing={1} sx={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: 'min(560px, 90vw)' }}>
      {toasts.map((t) => (
        <Snackbar key={t.id} open anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} onClose={() => dismissToast(t.id)}>
          <Alert severity={t.severity} variant="filled" onClose={() => dismissToast(t.id)} sx={{ width: '100%', borderRadius: 3 }}>
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}
