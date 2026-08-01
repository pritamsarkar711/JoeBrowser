// ============================================================
// Joe Browser - Main App Component
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Fab,
  Tooltip,
  Alert,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ImportExport as ImportIcon,
} from '@mui/icons-material';
import { AppProvider, useApp } from './store';
import Sidebar from './components/Sidebar';
import ProfileCard from './components/ProfileCard';
import NewProfileDialog from './components/NewProfileDialog';
import MasterPasswordGate from './components/MasterPasswordGate';

function AppContent() {
  const { state, actions } = useApp();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('profiles');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);

  // Load profiles on mount
  useEffect(() => {
    if (!state.isLocked) {
      actions.loadProfiles();
    }
  }, [state.isLocked]);

  // Refresh running profiles periodically
  useEffect(() => {
    if (!state.isLocked) {
      const interval = setInterval(() => {
        actions.refreshRunning();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [state.isLocked]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    let profiles = state.profiles;

    // Browser filter
    if (state.filterBrowser !== 'all') {
      profiles = profiles.filter((p) => p.browserType === state.filterBrowser);
    }

    // Search filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.browserType.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.group.toLowerCase().includes(q),
      );
    }

    return profiles;
  }, [state.profiles, state.filterBrowser, state.searchQuery]);

  // Handle create profile
  const handleCreateProfile = async (input: any) => {
    await actions.createProfile(input);
  };

  // Handle edit profile
  const handleEditProfile = (profile: any) => {
    setEditingProfile(profile.id);
  };

  // Master password gate
  if (state.isLocked) {
    return (
      <MasterPasswordGate
        mode={state.masterPasswordInitialized ? 'unlock' : 'create'}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Sidebar
        onNewProfile={() => setNewDialogOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header Bar */}
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
            Profiles
          </Typography>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search profiles..."
            value={state.searchQuery}
            onChange={(e) => actions.setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 280,
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
            }}
          />

          {/* Import */}
          <Tooltip title="Import Profile">
            <IconButton onClick={() => actions.importProfile()} size="small">
              <ImportIcon />
            </IconButton>
          </Tooltip>

          {/* Refresh */}
          <Tooltip title="Refresh">
            <IconButton onClick={() => actions.loadProfiles()} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Grid */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {state.loading && state.profiles.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : state.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          ) : filteredProfiles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No profiles found
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                {state.searchQuery
                  ? 'Try a different search term'
                  : 'Create your first profile to get started'}
              </Typography>
              {!state.searchQuery && (
                <Button
                  variant="contained"
                  onClick={() => setNewDialogOpen(true)}
                  startIcon={<AddIcon />}
                >
                  Create Profile
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredProfiles.map((profile) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={profile.id}>
                  <ProfileCard
                    profile={profile}
                    onEdit={handleEditProfile}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* FAB - New Profile */}
      <Fab
        color="primary"
        onClick={() => setNewDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #6c63ff 0%, #4a42d4 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b83ff 0%, #6c63ff 100%)',
          },
        }}
      >
        <AddIcon />
      </Fab>

      {/* New Profile Dialog */}
      <NewProfileDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onSubmit={handleCreateProfile}
      />
    </Box>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
