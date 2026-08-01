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
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
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
  const { selectProfile, duplicateProfile, deleteProfile } = useApp()
  const toast = useToast()
  const proxyEnabled = profile.proxy.enabled
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [exportPw, setExportPw] = useState('')

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
      <Tooltip
        title={`${profile.name} · ${proxyEnabled ? 'proxy: ' + profile.proxy.type + '://' + profile.proxy.host + ':' + profile.proxy.port : 'no proxy'}`}
        placement="right"
      >
        <Box
          onClick={() => {
            selectProfile(profile.id)
            onSelect?.()
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ x: e.clientX, y: e.clientY })
          }}
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
            '&:hover': {
              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.15 : 0.08)
            },
            transition: 'background-color .15s ease, border-color .15s ease'
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <BrowserIcon type={profile.browserType} size={30} />
            <Box
              sx={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: proxyEnabled ? 'success.main' : 'action.disabled',
                border: '2px solid',
                borderColor: 'background.paper'
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
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
