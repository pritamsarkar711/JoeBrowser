/**
 * Material Design 3 inspired theme — light & dark palettes.
 */
import { createTheme, type Theme } from '@mui/material/styles'

const base = {
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", system-ui, -apple-system, sans-serif',
    button: { textTransform: 'none' as const }
  }
}

export const lightTheme: Theme = createTheme({
  ...base,
  palette: {
    mode: 'light',
    primary: { main: '#6750a4' },
    secondary: { main: '#625b71' },
    background: { default: '#f7f6fa', paper: '#ffffff' },
    error: { main: '#ba1a1a' },
    success: { main: '#2e7d32' },
    warning: { main: '#b26a00' },
    divider: 'rgba(0,0,0,0.08)'
  }
})

export const darkTheme: Theme = createTheme({
  ...base,
  palette: {
    mode: 'dark',
    primary: { main: '#cfbcff' },
    secondary: { main: '#cbc2db' },
    background: { default: '#121116', paper: '#1c1b21' },
    error: { main: '#ffb4ab' },
    success: { main: '#7ee2a0' },
    warning: { main: '#ffd28a' },
    divider: 'rgba(255,255,255,0.09)'
  }
})
