import { useState } from 'react'
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  alpha
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import type { ProfileData } from '@shared/types'
import { BrowserIcon } from './BrowserIcon'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'

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

/** One profile row in the sidebar (with right-click context menu). */
export function ProfileCard({
  profile,
  selected,
  running,
  onSelect
}: {
  profile: ProfileData
  selected: boolean
  running: boolean
  onSelect?: () => void
}): React.JSX.Element {
  const { selectProfile, duplicateProfile, deleteProfile, launchProfile } = useApp()
  const toast = useToast()
  const proxyEnabled = profile.proxy.enabled
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [exportPw, setExportPw] = useState('')
  const [hovered, setHovered] = useState(false)

  const handleExport = async (): Promise<void> => {
    try {
      const json = await window.stealth.exportProfile(profile.id, exportPw)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stealth-profile-${profile.name.replace(/[^\w.-]+/g, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportOpen(false)
      setExportPw('')
      toast.success('Encrypted profile export downloaded')
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <>
      <Box
        onClick={() => {
          selectProfile(profile.id)
          onSelect?.()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenu({ x: e.clientX, y: e.clientY })
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 0.75,
          borderRadius: 1,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: selected ? 'primary.main' : 'transparent',
          bgcolor: selected ? alpha('#6750a4', 0.12) : 'transparent',
          '&:hover': {
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.15 : 0.08)
          },
          transition: 'background-color .15s ease, border-color .15s ease'
        }}
      >
        {/* Browser icon with running indicator */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <BrowserIcon type={profile.browserType} size={28} />
          {running && (
            <Box
              sx={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'success.main',
                border: '2px solid',
                borderColor: 'background.paper',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(46,125,50,0.4)' },
                  '70%': { boxShadow: '0 0 0 6px rgba(46,125,50,0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(46,125,50,0)' }
                }
              }}
            />
          )}
          {!running && proxyEnabled && (
            <Box
              sx={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'action.disabled',
                border: '1.5px solid',
                borderColor: 'background.paper'
              }}
            />
          )}
        </Box>

        {/* Name + meta */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {profile.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10 }}>
            {timeAgo(profile.lastLaunchedAt)}
            {proxyEnabled && ` · ${profile.proxy.type.toUpperCase()}`}
          </Typography>
        </Box>

        {/* Quick-launch on hover, or running chip */}
        {hovered && !running ? (
          <Tooltip title="Launch" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                void launchProfile(profile.id, {})
              }}
              sx={{ p: 0.5 }}
            >
              <RocketLaunchIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : running ? (
          <Chip
            size="small"
            label="● ON"
            color="success"
            sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.5 } }}
          />
        ) : null}
      </Box>

      <Menu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
      >
        <MenuItem
          onClick={() => {
            setMenu(null)
            void duplicateProfile(profile.id)
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenu(null)
            setExportOpen(true)
          }}
        >
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export (encrypted JSON)</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenu(null)
            setConfirmDeleteOpen(true)
          }}
        >
          <ListItemIcon>
            <DeleteOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>Delete profile?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete "{profile.name}" and all its browser data. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDeleteOpen(false)
              void deleteProfile(profile.id)
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Export encrypted profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Export password"
            size="small"
            value={exportPw}
            onChange={(e) => setExportPw(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={exportPw.length < 4} onClick={() => void handleExport()}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
