import { Box, Chip, Stack, Tooltip, Typography, alpha } from '@mui/material'
import type { ProfileData } from '@shared/types'
import { BrowserIcon } from './BrowserIcon'
import { useApp } from '../store'

function timeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

/** One profile row in the sidebar. */
export function ProfileCard({
  profile,
  selected,
  running
}: {
  profile: ProfileData
  selected: boolean
  running: boolean
}): React.JSX.Element {
  const { selectProfile } = useApp()
  const proxyEnabled = profile.proxy.enabled

  return (
    <Tooltip
      title={`${profile.name} · ${proxyEnabled ? 'proxy: ' + profile.proxy.type + '://' + profile.proxy.host + ':' + profile.proxy.port : 'no proxy'}`}
      placement="right"
    >
      <Box
        onClick={() => selectProfile(profile.id)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.25,
          borderRadius: 2.5,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: selected ? 'primary.main' : 'transparent',
          bgcolor: selected ? alpha('#6750a4', 0.12) : 'transparent',
          '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.15 : 0.08) },
          transition: 'background-color .15s ease, border-color .15s ease'
        }}
      >
        <BrowserIcon type={profile.browserType} size={30} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2"  noWrap sx={{ fontWeight: 600 }}>
            {profile.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Last launched: {timeAgo(profile.lastLaunchedAt)}
          </Typography>
        </Box>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
          {proxyEnabled && (
            <Chip
              size="small"
              label={profile.proxy.type.toUpperCase()}
              variant="outlined"
              color="secondary"
              sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
          {running && (
            <Chip
              size="small"
              label="● RUNNING"
              color="success"
              sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Stack>
      </Box>
    </Tooltip>
  )
}
