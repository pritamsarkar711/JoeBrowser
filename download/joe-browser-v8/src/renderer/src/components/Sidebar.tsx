// ============================================================
// Joe Browser - Sidebar Component
// Navigation sidebar with profile filters
// ============================================================

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  FileDownload as DownloadIcon,
  Lock as LockIcon,
  FilterList as FilterIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { BrowserType, BROWSER_THEMES } from '../../../shared/types';
import BrowserIcon from './BrowserIcon';
import { useApp } from '../store';

interface SidebarProps {
  onNewProfile: () => void;
  onOpenSettings: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewProfile, onOpenSettings, currentPage, onNavigate }) => {
  const { state, actions } = useApp();

  const browserFilters: { type: BrowserType | 'all'; label: string }[] = [
    { type: 'all', label: 'All Browsers' },
    { type: 'chrome', label: 'Chrome' },
    { type: 'brave', label: 'Brave' },
    { type: 'firefox', label: 'Firefox' },
    { type: 'edge', label: 'Edge' },
    { type: 'chromium', label: 'Chromium' },
  ];

  const profileCount = (type: BrowserType | 'all') => {
    if (type === 'all') return state.profiles.length;
    return state.profiles.filter((p) => p.browserType === type).length;
  };

  return (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        bgcolor: '#12122b',
        borderRight: '1px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6c63ff 0%, #4a42d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'white',
            letterSpacing: '-0.5px',
          }}
        >
          JB
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1rem' }}>
            Joe Browser
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
            Anti-Detect Browser
          </Typography>
        </Box>
      </Box>

      {/* New Profile Button */}
      <Box sx={{ p: 1.5 }}>
        <Box
          onClick={onNewProfile}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1,
            px: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #6c63ff 0%, #4a42d4 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
            },
          }}
        >
          <AddIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            New Profile
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List dense sx={{ px: 1 }}>
        <ListItemButton
          selected={currentPage === 'profiles'}
          onClick={() => onNavigate('profiles')}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="All Profiles" />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {state.profiles.length}
          </Typography>
        </ListItemButton>
      </List>

      {/* Browser Filters */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Filter by Browser
        </Typography>
      </Box>
      <List dense sx={{ px: 1, flex: 1, overflow: 'auto' }}>
        {browserFilters.map((filter) => (
          <ListItemButton
            key={filter.type}
            selected={state.filterBrowser === filter.type}
            onClick={() => actions.setFilterBrowser(filter.type)}
            sx={{ borderRadius: 2, mb: 0.25 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {filter.type === 'all' ? (
                <FilterIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              ) : (
                <BrowserIcon browser={filter.type} size={18} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={filter.label}
              primaryTypographyProps={{ fontSize: '0.813rem' }}
            />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {profileCount(filter.type)}
            </Typography>
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: '#2a2a3e' }} />

      {/* Bottom Actions */}
      <Box sx={{ p: 1 }}>
        <List dense>
          <ListItemButton onClick={onOpenSettings} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.813rem' }} />
          </ListItemButton>
          <ListItemButton onClick={() => {}} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Download" primaryTypographyProps={{ fontSize: '0.813rem' }} />
          </ListItemButton>
          <ListItemButton onClick={() => actions.lock()} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Lock" primaryTypographyProps={{ fontSize: '0.813rem' }} />
          </ListItemButton>
        </List>
      </Box>

      {/* Footer Credit */}
      <Box
        sx={{
          p: 1.5,
          textAlign: 'center',
          borderTop: '1px solid #2a2a3e',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>
          Built with <span style={{ color: '#e74c3c' }}>&#10084;</span> by Joe Goldberg
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;
