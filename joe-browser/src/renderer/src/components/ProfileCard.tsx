// ============================================================
// Joe Browser - Profile Card Component
// ============================================================

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  CloudDownload as ExportIcon,
} from '@mui/icons-material';
import { ProfileData, BROWSER_THEMES } from '../../../shared/types';
import BrowserIcon from './BrowserIcon';
import { useApp } from '../store';

interface ProfileCardProps {
  profile: ProfileData;
  isRunning: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isRunning }) => {
  const { actions } = useApp();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [launching, setLaunching] = useState(false);

  const theme = BROWSER_THEMES[profile.browserType] || BROWSER_THEMES.chrome;

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      await actions.launchProfile(profile.id);
    } finally {
      setLaunching(false);
    }
  };

  const handleStop = async () => {
    await actions.closeProfile(profile.id);
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
  };

  const handleExport = async () => {
    setMenuAnchor(null);
    await window.joeAPI.profiles.export(profile.id);
  };

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'visible',
        '&::before': isRunning ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`,
          borderRadius: '12px 12px 0 0',
        } : {},
      }}
    >
      {/* Loading bar */}
      {launching && <LinearProgress sx={{ borderRadius: '12px 12px 0 0' }} />}

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Top row: Icon + Name + Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <BrowserIcon browser={profile.browserType} size={32} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {profile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {theme.name} · {profile.os} · {profile.deviceType}
            </Typography>
          </Box>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Tags */}
        {profile.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {profile.tags.slice(0, 3).map((tag, i) => (
              <Chip key={i} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
            ))}
            {profile.tags.length > 3 && (
              <Chip label={`+${profile.tags.length - 3}`} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
            )}
          </Box>
        )}

        {/* Proxy indicator */}
        {profile.proxy && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Proxy: {profile.proxy.type}://{profile.proxy.host}:{profile.proxy.port}
          </Typography>
        )}

        {/* Last used */}
        {profile.lastUsed && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Last used: {new Date(profile.lastUsed).toLocaleDateString()}
          </Typography>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {isRunning ? (
            <Tooltip title="Stop Profile">
              <IconButton
                size="small"
                onClick={handleStop}
                sx={{
                  background: 'rgba(234, 67, 53, 0.1)',
                  color: '#ea4335',
                  '&:hover': { background: 'rgba(234, 67, 53, 0.2)' },
                }}
              >
                <StopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Launch Profile">
              <IconButton
                size="small"
                onClick={handleLaunch}
                disabled={launching}
                sx={{
                  background: `rgba(${hexToRgb(theme.primary)}, 0.1)`,
                  color: theme.primary,
                  '&:hover': { background: `rgba(${hexToRgb(theme.primary)}, 0.2)` },
                }}
              >
                <PlayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isRunning && (
            <Chip
              label="Running"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                background: `rgba(52, 168, 83, 0.1)`,
                color: '#34A853',
                border: '1px solid rgba(52, 168, 83, 0.3)',
              }}
            />
          )}
        </Box>
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { background: '#1a1a2e', border: '1px solid #2a2a3e' } }}
      >
        <MenuItem onClick={() => { setMenuAnchor(null); handleLaunch(); }} disabled={isRunning}>
          <ListItemIcon><PlayIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Launch</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExport}>
          <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: '#ea4335' }}>
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#ea4335' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '108, 99, 255';
}

export default ProfileCard;
