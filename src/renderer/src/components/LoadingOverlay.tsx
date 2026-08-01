import { Backdrop, CircularProgress, Typography } from '@mui/material'

/** Full-window loading overlay used during launches. */
export function LoadingOverlay({ open, label }: { open: boolean; label?: string }): React.JSX.Element {
  return (
    <Backdrop open={open} sx={{ zIndex: 10000, flexDirection: 'column', gap: 2, bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
      <CircularProgress color="primary" />
      {label && <Typography color="common.white">{label}</Typography>}
    </Backdrop>
  )
}
