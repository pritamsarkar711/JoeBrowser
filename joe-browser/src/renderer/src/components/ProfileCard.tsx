// ============================================================
// Joe Browser - Profile Card Component
// Displays a profile with actions (launch, edit, delete)
// ============================================================

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  FileDownload as ExportIcon,
  Stop as StopIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { ProfileData, BROWSER_THEMES } from '../../../shared/types';
import BrowserIcon from './BrowserIcon';
import { useApp } from '../store';

interface ProfileCardProps {
  profile: ProfileData;
  onEdit: (profile: ProfileData) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit }) => {
  const { actions } = useApp();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [launching, setLaunching] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const theme = BROWSER_THEMES[profile.browserType];
  const isRunning = state.runningProfiles.includes(profile.id);

  const handleLaunch = async () => {
    setLaunching(true);
    setMenuAnchor(null);
    try {
      const success = await actions.launchProfile(profile.id);
      if (!success) {
        setSnackMsg('Failed to launch profile. Check your configuration.');
        setSnackOpen(true);
      }
    } catch (err) {
      setSnackMsg('Error launching profile: ' + (err as any).message);
      setSnackOpen(true);
    }
    setLaunching(false);
  };

  const handleDelete = async () => {
    setMenuAnchor(null);
    if (window.confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
      await actions.deleteProfile(profile.id);
    }
  };

  const handleDuplicate = async () => {
    setMenuAnchor(null);
    await actions.duplicateProfile(profile.id);
    setSnackMsg('Profile duplicated!');
    setSnackOpen(true);
  };

  const handleExport = async () => {
    setMenuAnchor(null);
    await actions.exportProfile(profile.id);
  };

  const timeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <>
      <Card
        sx={{
          position: 'relative',
          overflow: 'visible',
          cursor: 'pointer',
          ...(isRunning && {
            borderColor: `${theme.primary}66`,
            boxShadow: `0 0 12px ${theme.primary}22`,
          }),
          '&:hover .launch-btn': {
            opacity: 1,
            transform: 'scale(1)',
          },
        }}
      >
        {/* Running indicator */}
        {isRunning && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              boxShadow: '0 0 6px rgba(52, 168, 83, 0.5)',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
        )}
        {/* Browser type color stripe */}
        <Box
          sx={{
            height: 3,
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`,
            borderRadius: '12px 12px 0 0',
          }}
        />

        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Top row: Icon + Name + Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <BrowserIcon browser={profile.browserType} size={32} />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                {profile.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
              >
                {theme.name} • {profile.os} • {profile.deviceType}
              </Typography>
            </Box>

            {/* Quick Launch Button */}
            <Tooltip title="Launch Profile" arrow>
              <IconButton
                className="launch-btn"
                onClick={handleLaunch}
                disabled={launching}
                size="small"
                sx={{
                  bgcolor: launching ? 'transparent' : `${theme.primary}22`,
                  color: theme.primary,
                  opacity: 0.7,
                  transform: 'scale(0.9)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: `${theme.primary}33`,
                    opacity: 1,
                    transform: 'scale(1.05)',
                  },
                  '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
                }}
              >
                {launching ? (
                  <LinearProgress
                    sx={{ width: 20, height: 2, borderRadius: 1 }}
                  />
                ) : (
                  <PlayArrowIcon />
                )}
              </IconButton>
            </Tooltip>

            {/* More Menu */}
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Tags */}
          {profile.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {profile.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: `${theme.primary}15`,
                    color: theme.primary,
                    border: `1px solid ${theme.primary}30`,
                  }}
                />
              ))}
              {profile.tags.length > 3 && (
                <Chip
                  label={`+${profile.tags.length - 3}`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          )}

          {/* Proxy indicator */}
          {profile.proxy && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.65rem' }}>
                🔒 {profile.proxy.type.toUpperCase()} {profile.proxy.host}:{profile.proxy.port}
              </Typography>
            </Box>
          )}

          {/* Last used */}
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>
            {profile.lastUsed ? `Last used ${timeAgo(profile.lastUsed)}` : `Created ${timeAgo(profile.createdAt)}`}
          </Typography>
        </CardContent>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{
            sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, minWidth: 180 },
          }}
        >
          <MenuItem onClick={handleLaunch} disabled={isRunning}>
            <ListItemIcon><PlayArrowIcon fontSize="small" sx={{ color: isRunning ? 'text.disabled' : 'success.main' }} /></ListItemIcon>
            <ListItemText>{isRunning ? 'Running...' : 'Launch'}</ListItemText>
          </MenuItem>
          {isRunning && (
            <MenuItem onClick={async () => { setMenuAnchor(null); await actions.closeProfile(profile.id); }}>
              <ListItemIcon><StopIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
              <ListItemText>Stop</ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={() => { setMenuAnchor(null); onEdit(profile); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDuplicate}>
            <ListItemIcon><DuplicateIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleExport}>
            <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Export</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </Card>

      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackMsg.includes('Failed') || snackMsg.includes('Error') ? 'error' : 'success'} onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfileCard;
