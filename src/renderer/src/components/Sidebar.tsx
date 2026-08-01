import { useMemo, useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  InputBase,
  List,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Stack,
  Divider
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import DownloadIcon from '@mui/icons-material/Download'
import SettingsIcon from '@mui/icons-material/Settings'
import LockIcon from '@mui/icons-material/Lock'
import type { BrowserType } from '@shared/types'
import { BROWSER_NAMES, BROWSER_LABELS } from '@shared/types'
import { ProfileCard } from './ProfileCard'
import { useApp } from '../store'

/** Joe Browser logo SVG */
function JoeBrowserLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="jb-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#5B5FC7" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#jb-grad)" />
      <circle cx="24" cy="24" r="8" fill="#fff" opacity="0.9" />
      <circle cx="24" cy="24" r="5.5" fill="url(#jb-grad)" />
      <path d="M24 8l-3 6h6z" fill="#fff" opacity="0.7" />
      <path d="M36 24l-6-3v6z" fill="#fff" opacity="0.7" />
      <path d="M12 24l6-3v6z" fill="#fff" opacity="0.7" />
      <path d="M24 40l3-6h-6z" fill="#fff" opacity="0.7" />
    </svg>
  )
}

interface Props {
  onNewProfile: () => void
  onSettings: () => void
  onDownload: () => void
  onMobileClose?: () => void
}

export function Sidebar({ onNewProfile, onSettings, onDownload, onMobileClose }: Props): React.JSX.Element {
  const { profiles, selectedId, selectProfile, launchProfile, setBusy, lock } = useApp()
  const [search, setSearch] = useState('')
  const [filterBrowser, setFilterBrowser] = useState<BrowserType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed' | 'browserType'>('name')

  const filtered = useMemo(() => {
    let list = [...profiles]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
    }
    if (filterBrowser !== 'all') {
      list = list.filter((p) => p.browserType === filterBrowser)
    }
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'lastUsed') return (b.lastLaunchedAt ?? 0) - (a.lastLaunchedAt ?? 0)
      return a.browserType.localeCompare(b.browserType)
    })
    return list
  }, [profiles, search, filterBrowser, sortBy])

  const handleLaunch = (id: string): void => {
    setBusy(true)
    launchProfile(id, { url: undefined })
      .catch(() => {})
      .finally(() => setBusy(false))
  }

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <JoeBrowserLogo size={28} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1 }}>
            Joe Browser
          </Typography>
        </Stack>

        {/* Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 1.5,
            mb: 1.5,
            height: 36,
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
          <InputBase
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, fontSize: 13 }}
          />
        </Box>

        {/* Filters */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <InputLabel sx={{ fontSize: 12 }}>Browser</InputLabel>
            <Select
              label="Browser"
              value={filterBrowser}
              onChange={(e) => setFilterBrowser(e.target.value as BrowserType | 'all')}
              sx={{ fontSize: 12, height: 32 }}
            >
              <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
              {BROWSER_NAMES.map((b) => (
                <MenuItem key={b} value={b} sx={{ fontSize: 12 }}>{BROWSER_LABELS[b]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <InputLabel sx={{ fontSize: 12 }}>Sort</InputLabel>
            <Select
              label="Sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              sx={{ fontSize: 12, height: 32 }}
            >
              <MenuItem value="name" sx={{ fontSize: 12 }}>Name</MenuItem>
              <MenuItem value="lastUsed" sx={{ fontSize: 12 }}>Last used</MenuItem>
              <MenuItem value="browserType" sx={{ fontSize: 12 }}>Browser</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* New profile button */}
        <IconButton
          size="small"
          onClick={() => { onNewProfile(); onMobileClose?.() }}
          sx={{
            width: '100%',
            height: 34,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            gap: 0.5,
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: 12 }}>New Profile</Typography>
        </IconButton>
      </Box>

      {/* Profile list */}
      <List sx={{ flex: 1, overflowY: 'auto', px: 1, py: 0 }}>
        {filtered.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            selected={p.id === selectedId}
            onSelect={() => { selectProfile(p.id); onMobileClose?.() }}
            onLaunch={() => handleLaunch(p.id)}
          />
        ))}
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontSize: 12 }}>
            {profiles.length === 0 ? 'No profiles yet. Create one!' : 'No matches found.'}
          </Typography>
        )}
      </List>

      {/* Footer */}
      <Divider />
      <Box sx={{ px: 1.5, py: 1 }}>
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
          <Tooltip title="Download">
            <IconButton size="small" onClick={() => { onDownload(); onMobileClose?.() }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => { onSettings(); onMobileClose?.() }}>
              <SettingsIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lock">
            <IconButton size="small" onClick={() => { lock(); onMobileClose?.() }}>
              <LockIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: 'text.disabled',
            fontSize: 9,
            mt: 0.5,
            lineHeight: 1.2,
          }}
        >
          Built with ❤️ by Joe Goldberg · @joegoldberg2025
        </Typography>
      </Box>
    </Box>
  )

  const DRAWER_WIDTH = 260

  return (
    <Box
      component="nav"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Drawer
        variant="permanent"
        open
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            position: 'relative',
            height: '100%',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  )
}
