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
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import SettingsIcon from '@mui/icons-material/Settings'
import LockIcon from '@mui/icons-material/Lock'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import type { BrowserType } from '@shared/types'
import { BROWSER_NAMES } from '@shared/types'
import { useApp } from '../store'
import { ProfileCard } from './ProfileCard'
import { BrowserIcon } from './BrowserIcon'

type Filter = 'all' | BrowserType

/** Left sidebar: searchable, filterable profile list + actions.
 *  Persistent on wide screens, temporary (hamburger) on narrow. */
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
  const { profiles, running, selectedId, lock, selectProfile } = useApp()
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

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              JoeBrowser
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Local anti-detect browser
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
          <ToggleButton
            value="all"
            sx={{ px: 1, py: 0.25, fontSize: 12, borderRadius: '20px !important', border: 'none' }}
          >
            All
          </ToggleButton>
          {BROWSER_NAMES.map((b) => (
            <ToggleButton
              key={b}
              value={b}
              sx={{ px: 1, py: 0.25, borderRadius: '20px !important', border: 'none' }}
            >
              <BrowserIcon type={b} size={16} />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* New profile */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            onNewProfile()
            onMobileClose?.()
          }}
        >
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
              onSelect={() => {
                selectProfile(p.id)
                onMobileClose?.()
              }}
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
        <Stack spacing={1}>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => {
              onDownload()
              onMobileClose?.()
            }}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg,#6750a4,#7e5dff)',
              boxShadow: '0 4px 14px #6750a455'
            }}
          >
            Download EXE
          </Button>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Settings">
              <IconButton
                onClick={() => {
                  onSettings()
                  onMobileClose?.()
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lock (encrypt all data)">
              <IconButton onClick={() => void lock()}>
                <LockIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Windows EXE">
              <IconButton onClick={() => { onDownload(); onMobileClose?.() }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )

  if (isNarrow) {
    return (
      <>
        {/* Mobile top bar with hamburger */}
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
            JoeBrowser
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
