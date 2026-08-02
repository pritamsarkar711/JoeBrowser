// ============================================================
// Joe Browser - Sidebar Component
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
  Button,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Language as AllIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { BrowserType, BROWSER_THEMES } from '../../../shared/types';
import BrowserIcon from './BrowserIcon';
import { useApp } from '../store';

const browserFilters: { type: BrowserType | 'all'; label: string }[] = [
  { type: 'all', label: 'All Profiles' },
  { type: 'chrome', label: 'Chrome' },
  { type: 'brave', label: 'Brave' },
  { type: 'firefox', label: 'Firefox' },
  { type: 'edge', label: 'Edge' },
  { type: 'chromium', label: 'Chromium' },
];

const Sidebar: React.FC = () => {
  const { state, actions } = useApp();

  const handleNewProfile = () => {
    // Dispatch custom event to open the NewProfileDialog
    window.dispatchEvent(new CustomEvent('open-new-profile'));
  };

  return (
    <Box
      sx={{
        width: 240,
        minWidth: 240,
        height: '100vh',
        background: '#0a0a1a',
        borderRight: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            fontSize: '1rem',
            color: 'white',
            flexShrink: 0,
          }}
        >
          JB
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Joe Browser
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Anti-Detect
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#1a1a2e' }} />

      {/* New Profile Button */}
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleNewProfile}
          sx={{ py: 1, borderRadius: 2 }}
        >
          New Profile
        </Button>
      </Box>

      {/* Browser Filters */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Browser Type
        </Typography>
        <List dense sx={{ py: 0 }}>
          {browserFilters.map(filter => {
            const count = filter.type === 'all'
              ? state.profiles.length
              : state.profiles.filter(p => p.browserType === filter.type).length;

            return (
              <ListItemButton
                key={filter.type}
                selected={state.activeFilter === filter.type}
                onClick={() => actions.setActiveFilter(filter.type)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    background: 'rgba(108, 99, 255, 0.1)',
                    '&:hover': { background: 'rgba(108, 99, 255, 0.15)' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {filter.type === 'all' ? (
                    <AllIcon sx={{ fontSize: 20, color: '#6c63ff' }} />
                  ) : (
                    <BrowserIcon browser={filter.type} size={20} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={filter.label}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: state.activeFilter === filter.type ? 600 : 400 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {count}
                </Typography>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #1a1a2e' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          Built with ❤️ by Joe Goldberg
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 0.5 }}>
          v9.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;
