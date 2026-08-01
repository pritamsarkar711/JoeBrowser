/**
 * Material Design 3 inspired theme — light & dark palettes.
 * Clean, minimalist design with high contrast and accessibility.
 */
import { createTheme, type Theme } from '@mui/material/styles'

const base = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Roboto", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    button: { textTransform: 'none' as const, fontWeight: 600 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 }
  }
}

export const lightTheme: Theme = createTheme({
  ...base,
  palette: {
    mode: 'light',
    primary: { main: '#5B5FC7', light: '#8B8FD9', dark: '#3D40A8' },
    secondary: { main: '#625b71' },
    background: { default: '#F8F7FC', paper: '#FFFFFF' },
    error: { main: '#BA1A1A' },
    success: { main: '#2E7D32' },
    warning: { main: '#B26A00' },
    info: { main: '#5B5FC7' },
    divider: 'rgba(0,0,0,0.06)',
    text: { primary: '#1C1B1F', secondary: '#49454F' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        contained: { boxShadow: '0 1px 3px rgba(91,95,199,0.3)', '&:hover': { boxShadow: '0 2px 6px rgba(91,95,199,0.4)' } }
      }
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } }
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 14 } }
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0,0,0,0.15)'
          }
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    }
  }
})

export const darkTheme: Theme = createTheme({
  ...base,
  palette: {
    mode: 'dark',
    primary: { main: '#C4C0FF', light: '#D9D6FF', dark: '#9D96F6' },
    secondary: { main: '#CBC2DB' },
    background: { default: '#121116', paper: '#1D1B22' },
    error: { main: '#FFB4AB' },
    success: { main: '#7EE2A0' },
    warning: { main: '#FFD28A' },
    info: { main: '#C4C0FF' },
    divider: 'rgba(255,255,255,0.08)',
    text: { primary: '#E6E1E5', secondary: '#B0ACB8' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        contained: { boxShadow: '0 1px 3px rgba(196,192,255,0.2)', '&:hover': { boxShadow: '0 2px 6px rgba(196,192,255,0.3)' } }
      }
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } }
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 14 } }
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.18)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#C4C0FF'
          }
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 }
      },
      variants: [
        {
          props: { variant: 'standard', severity: 'info' },
          style: {
            bgcolor: 'rgba(196,192,255,0.08)',
            color: '#D9D6FF',
            '& .MuiAlert-icon': { color: '#C4C0FF' }
          }
        },
        {
          props: { variant: 'standard', severity: 'success' },
          style: {
            bgcolor: 'rgba(126,226,160,0.08)',
            color: '#A0E8B8',
            '& .MuiAlert-icon': { color: '#7EE2A0' }
          }
        },
        {
          props: { variant: 'standard', severity: 'warning' },
          style: {
            bgcolor: 'rgba(255,210,138,0.08)',
            color: '#FFD28A',
            '& .MuiAlert-icon': { color: '#FFD28A' }
          }
        },
        {
          props: { variant: 'standard', severity: 'error' },
          style: {
            bgcolor: 'rgba(255,180,171,0.08)',
            color: '#FFB4AB',
            '& .MuiAlert-icon': { color: '#FFB4AB' }
          }
        }
      ]
    }
  }
})
