// ============================================================
// Joe Browser - Theme Configuration
// Dark theme with polished design
// ============================================================

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6c63ff',
      light: '#8b83ff',
      dark: '#4a42d4',
    },
    secondary: {
      main: '#ff6b6b',
      light: '#ff8a8a',
      dark: '#d44242',
    },
    background: {
      default: '#0f0f23',
      paper: '#1a1a2e',
    },
    text: {
      primary: '#e8eaed',
      secondary: '#9aa0a6',
    },
    divider: '#2a2a3e',
    success: {
      main: '#34A853',
    },
    error: {
      main: '#ea4335',
    },
    warning: {
      main: '#fbbc04',
    },
    info: {
      main: '#4285F4',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    body2: {
      fontSize: '0.813rem',
    },
    caption: {
      fontSize: '0.688rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6c63ff 0%, #4a42d4 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b83ff 0%, #6c63ff 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 12,
          transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            borderColor: '#6c63ff44',
            boxShadow: '0 4px 20px rgba(108, 99, 255, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#2a2a3e',
            },
            '&:hover fieldset': {
              borderColor: '#6c63ff66',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6c63ff',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: '#2a2a3e',
          color: '#e8eaed',
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

export default theme;
