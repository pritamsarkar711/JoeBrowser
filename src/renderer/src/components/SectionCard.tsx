import { Paper, Typography, Box, Stack, Tooltip, IconButton } from '@mui/material'
import type { ReactNode } from 'react'

/**
 * Reusable card used for every section of the profile editor.
 * Proper spacing to prevent overflow/overlap issues.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  actionTooltip,
  onAction,
  children
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  actionTooltip?: string
  onAction?: () => void
  children: ReactNode
}): React.JSX.Element {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        pt: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        mb: 2,
        overflow: 'hidden',
        '& .MuiTextField-root': {
          '& .MuiInputLabel-root': {
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          },
          '& .MuiInputBase-input': {
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        },
        '& .MuiSelect-select': {
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        },
        '& .MuiFormControlLabel-label': {
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }}
    >
      <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action &&
          (actionTooltip ? (
            <Tooltip title={actionTooltip}>
              <IconButton size="small" onClick={onAction}>
                {action}
              </IconButton>
            </Tooltip>
          ) : (
            <Box sx={{ flexShrink: 0 }}>{action}</Box>
          ))}
      </Stack>
      <Box sx={{ overflow: 'hidden' }}>
        {children}
      </Box>
    </Paper>
  )
}
