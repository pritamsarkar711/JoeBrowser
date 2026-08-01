/**
 * Theme — clean, professional, minimal border radius.
 * Material Design 3 inspired with reduced rounding for a sharper look.
 */
import { createTheme, type ThemeOptions } from '@mui/material/styles'

const shared = {
  shape: {
    borderRadius: 4, // Reduced from default 8 for sharper look
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h6: { fontWeight: 700, letterSpacing: '-0.02em' },
    subtitle1: { fontWeight: 600 },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.6875rem' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small' as const,
      },
    },
  },
} satisfies ThemeOptions

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#5B5FC7' },
    secondary: { main: '#8B5CF6' },
    background: { default: '#F8F7FC', paper: '#FFFFFF' },
    text: { primary: '#1D1B22', secondary: '#5F5D6B' },
    divider: '#E5E1EB',
    success: { main: '#0F9D58' },
    error: { main: '#DB4437' },
    warning: { main: '#F4B400' },
  },
})

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#C4C0FF' },
    secondary: { main: '#B794F6' },
    background: { default: '#121116', paper: '#1D1B22' },
    text: { primary: '#E8E5F0', secondary: '#9B97A8' },
    divider: '#2E2C36',
    success: { main: '#34D399' },
    error: { main: '#F87171' },
    warning: { main: '#FBBF24' },
  },
})
