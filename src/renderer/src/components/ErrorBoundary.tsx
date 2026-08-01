/**
 * Catches React rendering errors and shows a diagnostic screen instead of a
 * blank white window. This is the #1 reason users see "the app doesn't open" —
 * a JS error in any component silently unmounts the entire tree.
 */
import React from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })
    // Also try to send this to the main process for logging
    try {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    } catch {
      /* logging must not throw */
    }
  }

  handleRestart = (): void => {
    // Try to reload the renderer
    window.location.reload()
  }

  handleCopyError = (): void => {
    const { error, errorInfo } = this.state
    const text = [
      'Joe Browser Error Report',
      '========================',
      `Time: ${new Date().toISOString()}`,
      `Error: ${error?.message ?? 'Unknown'}`,
      '',
      'Stack:',
      error?.stack ?? 'No stack trace',
      '',
      'Component Stack:',
      errorInfo?.componentStack ?? 'No component stack'
    ].join('\n')

    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: create a temporary textarea and use the Selection API
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* execCommand may not be available in all contexts */
      }
      document.body.removeChild(ta)
    })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#121116',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              maxWidth: 640,
              width: '100%',
              p: 4,
              bgcolor: '#1c1b21',
              borderRadius: 3
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffb4ab', mb: 2 }}>
              ⚠ Joe Browser encountered an error
            </Typography>

            <Typography variant="body2" sx={{ color: '#cbc2db', mb: 2 }}>
              The application failed to render. This is usually caused by a missing
              dependency, corrupted install, or a platform incompatibility.
            </Typography>

            <Paper
              sx={{
                p: 2,
                mb: 3,
                bgcolor: '#0d0d11',
                borderRadius: 2,
                maxHeight: 200,
                overflow: 'auto'
              }}
            >
              <Typography
                component="pre"
                variant="caption"
                sx={{
                  color: '#ffb4ab',
                  fontFamily: 'Consolas, "Courier New", monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  m: 0
                }}
              >
                {error?.message ?? 'Unknown error'}
                {'\n\n'}
                {error?.stack ?? 'No stack trace available'}
                {errorInfo?.componentStack ? '\n\nComponent Stack:' + errorInfo.componentStack : ''}
              </Typography>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={this.handleRestart}
                sx={{ bgcolor: '#6750a4', '&:hover': { bgcolor: '#7c6bb5' } }}
              >
                Reload App
              </Button>
              <Button variant="outlined" onClick={this.handleCopyError} sx={{ borderColor: '#49454f', color: '#cbc2db' }}>
                Copy Error Details
              </Button>
            </Box>

            <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#938f99' }}>
              If this keeps happening, try reinstalling Joe Browser or deleting the data
              folder at %APPDATA%/JoeBrowser (settings and profiles will be lost).
              Check crash.log in the logs folder for more details.
            </Typography>
          </Paper>
        </Box>
      )
    }

    return this.props.children
  }
}
