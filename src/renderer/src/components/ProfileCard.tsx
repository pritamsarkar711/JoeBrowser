import { useState } from 'react'
import {
  Box,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import type { ProfileData } from '@shared/types'
import { BROWSER_LABELS } from '@shared/types'
import { BrowserIcon } from './BrowserIcon'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'

interface Props {
  profile: ProfileData
  selected: boolean
  onSelect: () => void
  onLaunch: () => void
}

export function ProfileCard({ profile, selected, onSelect, onLaunch }: Props): React.JSX.Element {
  const { duplicateProfile, deleteProfile, exportProfile, running } = useApp()
  const toast = useToast()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPw, setExportPw] = useState('')

  const session = running[profile.id]
  const isRunning = !!session

  const handleDuplicate = async (): Promise<void> => {
    try {
      await duplicateProfile(profile.id)
      toast.success('Profile duplicated')
    } catch (e) {
      toast.error(String(e))
    }
    setMenuAnchor(null)
  }

  const handleExport = async (): Promise<void> => {
    if (!exportPw) {
      toast.error('Enter a password')
      return
    }
    try {
      const json = await exportProfile(profile.id, exportPw)
      await navigator.clipboard.writeText(json)
      toast.success('Exported (copied to clipboard)')
    } catch (e) {
      toast.error(String(e))
    }
    setExportOpen(false)
    setExportPw('')
    setMenuAnchor(null)
  }

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteProfile(profile.id)
      toast.success('Profile deleted')
    } catch (e) {
      toast.error(String(e))
    }
    setMenuAnchor(null)
  }

  return (
    <>
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          py: 1,
          px: 1.5,
          border: '1px solid transparent',
          '&.Mui-selected': {
            bgcolor: 'action.selected',
            borderColor: 'primary.main',
          },
          '&:hover': {
            bgcolor: 'action.hover',
          },
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 52,
        }}
      >
        {/* Browser icon */}
        <ListItemIcon sx={{ minWidth: 28 }}>
          <BrowserIcon type={profile.browserType} size={22} />
        </ListItemIcon>

        {/* Profile name & info */}
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 140,
              }}
            >
              {profile.name}
            </Typography>
          }
          secondary={
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 10, lineHeight: 1.2, display: 'block' }}
            >
              {BROWSER_LABELS[profile.browserType]}
            </Typography>
          }
          sx={{ ml: 0.5, my: 0 }}
        />

        {/* Running indicator */}
        {isRunning && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.6, transform: 'scale(1.3)' },
              },
              flexShrink: 0,
            }}
          />
        )}

        {/* Quick launch button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onLaunch()
          }}
          sx={{
            flexShrink: 0,
            width: 28,
            height: 28,
            '&:hover': { color: 'primary.main' },
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 18 }} />
        </IconButton>

        {/* More menu */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            setMenuAnchor(e.currentTarget)
          }}
          sx={{ flexShrink: 0, width: 28, height: 28 }}
        >
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </ListItemButton>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => void handleDuplicate()}>
          <ContentCopyIcon sx={{ mr: 1, fontSize: 18 }} /> Duplicate
        </MenuItem>
        <MenuItem onClick={() => { setExportOpen(true) }}>
          <FileDownloadIcon sx={{ mr: 1, fontSize: 18 }} /> Export
        </MenuItem>
        <MenuItem onClick={() => void handleDelete()} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Export dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Export Profile</DialogTitle>
        <DialogContent>
          <TextField
            label="Encryption password"
            type="password"
            size="small"
            fullWidth
            value={exportPw}
            onChange={(e) => setExportPw(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleExport()}>Export</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
