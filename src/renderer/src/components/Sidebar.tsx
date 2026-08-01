import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import SettingsIcon from '@mui/icons-material/Settings'
import DownloadIcon from '@mui/icons-material/Download'
import LockIcon from '@mui/icons-material/Lock'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import SortIcon from '@mui/icons-material/Sort'
import FavoriteIcon from '@mui/icons-material/Favorite'
import type { BrowserType } from '@shared/types'
import { BROWSER_NAMES } from '@shared/types'
import { useApp } from '../store'
import { ProfileCard } from './ProfileCard'
import { BrowserIcon } from './BrowserIcon'

type Filter = 'all' | BrowserType
type SortMode = 'name' | 'lastUsed' | 'browserType'

/** Left sidebar: searchable, filterable profile list + actions. */
export function Sidebar({
  width,
  onNewProfile,
  onSettings,
  onDownload,
  mobileOpen,
  onMobileClose,
  onMobileOpen
}: {
  width: number
  onNewProfile: () => void
  onSettings: () => void
  onDownload: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
  onMobileOpen?: () => void
}): React.JSX.Element {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))
  const { profiles, running, selectedId, lock, selectProfile, launchProfile } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<SortMode>('name')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = profiles.filter((p) => {
      if (filter !== 'all' && p.browserType !== filter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.tags ?? []).some((tag) => tag.toLowerCase().includes(q)) ||
        p.notes.toLowerCase().includes(q)
      )
    })
    const sorted = [...list]
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'lastUsed':
        sorted.sort((a, b) => (b.lastLaunchedAt ?? 0) - (a.lastLaunchedAt ?? 0))
        break
      case 'browserType':
        sorted.sort((a, b) => a.browserType.localeCompare(b.browserType))
        break
    }
    return sorted
  }, [profiles, query, filter, sort])

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(103,80,164,0.3)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <defs><linearGradient id="jb-grad" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#e0d8ff" /></linearGradient></defs>
              <circle cx="24" cy="24" r="22" fill="url(#jb-grad)" opacity="0.3" />
              <circle cx="24" cy="24" r="8" fill="#fff" opacity="0.9" />
              <circle cx="24" cy="24" r="5.5" fill="url(#jb-grad)" />
            </svg>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                Joe Browser
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1 }}>
                ({profiles.length})
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              Anti-detect browser
            </Typography>
          </Box>
          {isNarrow && (
            <IconButton size="small" onClick={onMobileClose} aria-label="Close menu">
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search..."
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
          sx={{
            flexWrap: 'wrap',
            gap: 0.5,
            '& .MuiToggleButton-root': {
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '6px !important',
              px: 1,
              py: 0.25,
              '&.Mui-selected': {
                borderColor: 'primary.main',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' }
              }
            }
          }}
        >
          <ToggleButton value="all" sx={{ fontSize: 11 }}>
            All
          </ToggleButton>
          {BROWSER_NAMES.map((b) => (
            <ToggleButton key={b} value={b}>
              <BrowserIcon type={b} size={14} />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Sort */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SortIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: 11 }}>Sort</InputLabel>
          <Select
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            sx={{ fontSize: 11, '& .MuiSelect-select': { py: 0.5 } }}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="lastUsed">Last used</MenuItem>
            <MenuItem value="browserType">Browser</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* New profile + Quick Launch */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              onNewProfile()
              onMobileClose?.()
            }}
            sx={{ flex: 1, fontSize: 13 }}
          >
            New
          </Button>
          {selectedId && !running[selectedId] && (
            <Tooltip title="Quick launch">
              <Button
                variant="outlined"
                onClick={() => void launchProfile(selectedId, {})}
                sx={{ minWidth: 44, px: 0 }}
              >
                <RocketLaunchIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Profile list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1 }}>
        <Stack spacing={0.5}>
          {filtered.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              selected={selectedId === p.id}
              running={!!running[p.id]}
              onSelect={() => {
                selectProfile(p.id)
                onMobileClose?.()
              }}
            />
          ))}
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontSize: 12 }}>
              {profiles.length === 0 ? 'No profiles yet' : 'No matches'}
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Footer with credit */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', mb: 1 }}>
          <Tooltip title="Download">
            <IconButton size="small" onClick={() => { onDownload(); onMobileClose?.() }}>
              <DownloadIcon fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => { onSettings(); onMobileClose?.() }}>
              <SettingsIcon fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lock">
            <IconButton size="small" onClick={() => void lock()}>
              <LockIcon fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
            Built with <FavoriteIcon sx={{ fontSize: 10, color: '#e91e63' }} /> by{' '}
            <Box
              component="a"
              href="https://t.me/joegoldberg2025"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
              onClick={(e) => e.stopPropagation()}
            >
              Joe Goldberg
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  )

  if (isNarrow) {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.drawer + 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <IconButton onClick={onMobileOpen} edge="start" aria-label="Open menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Joe Browser
          </Typography>
        </Box>
        <Drawer
          variant="temporary"
          open={!!mobileOpen}
          onClose={onMobileClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width, boxSizing: 'border-box' }
          }}
        >
          {content}
        </Drawer>
      </>
    )
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' }
      }}
    >
      {content}
    </Drawer>
  )
}
