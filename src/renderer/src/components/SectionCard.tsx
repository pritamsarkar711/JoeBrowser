import { Paper, Typography, Box, Stack, Tooltip, IconButton } from '@mui/material'
import type { ReactNode } from 'react'

/**
 * Reusable card used for every section of the profile editor.
 * Optional action icon button in the header row.
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
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        mb: 2,
        overflow: 'hidden'
      }}
    >
      <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
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
            <Box>{action}</Box>
          ))}
      </Stack>
      {children}
    </Paper>
  )
}
