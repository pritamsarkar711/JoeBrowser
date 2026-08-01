import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import SettingsIcon from '@mui/icons-material/Settings'
import LockIcon from '@mui/icons-material/Lock'
import type { BrowserType } from '@shared/types'
import { BROWSER_NAMES } from '@shared/types'
import { useApp } from '../store'
import { ProfileCard } from './ProfileCard'
import { BrowserIcon } from './BrowserIcon'

type Filter = 'all' | BrowserType

/** Left sidebar: searchable, filterable profile list + actions. */
export function Sidebar({
  width,
  onNewProfile,
  onSettings
}: {
  width: number
  onNewProfile: () => void
  onSettings: () => void
}): React.JSX.Element {
  const { profiles, running, selectedId, lock } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return profiles.filter((p) => {
      if (filter !== 'all' && p.browserType !== filter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.tags ?? []).some((tag) => tag.toLowerCase().includes(q)) ||
        p.notes.toLowerCase().includes(q)
      )
    })
  }, [profiles, query, filter])

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row"  spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16
              }}
            >
              S
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                StealthBrowser
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Local anti-detect browser
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Search */}
        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search profiles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Box>

        {/* Browser filter */}
        <Box sx={{ px: 2, pb: 1 }}>
          <ToggleButtonGroup
            size="small"
            value={filter}
            exclusive
            onChange={(_, v: Filter | null) => v && setFilter(v)}
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            <ToggleButton value="all" sx={{ px: 1, py: 0.25, fontSize: 12, borderRadius: '20px !important', border: 'none' }}>
              All
            </ToggleButton>
            {BROWSER_NAMES.map((b) => (
              <ToggleButton key={b} value={b} sx={{ px: 1, py: 0.25, borderRadius: '20px !important', border: 'none' }}>
                <BrowserIcon type={b} size={16} />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* New profile */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={onNewProfile}>
            New profile
          </Button>
        </Box>

        {/* Profile list */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1 }}>
          <Stack spacing={0.75}>
            {filtered.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                selected={selectedId === p.id}
                running={!!running[p.id]}
              />
            ))}
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                {profiles.length === 0 ? 'No profiles yet. Create your first one!' : 'No matching profiles.'}
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Footer actions */}
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Settings">
              <IconButton onClick={onSettings}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lock (encrypt all data)">
              <IconButton onClick={() => void lock()}>
                <LockIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}
