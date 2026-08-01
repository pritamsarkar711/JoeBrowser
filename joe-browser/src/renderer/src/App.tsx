// ============================================================
// Joe Browser - Main App Component
// ============================================================

import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProvider, useApp } from './store';
import Sidebar from './components/Sidebar';
import ProfileCard from './components/ProfileCard';
import NewProfileDialog from './components/NewProfileDialog';
import MasterPasswordGate from './components/MasterPasswordGate';

const AppContent: React.FC = () => {
  const { state, actions } = useApp();

  // Initialize app
  useEffect(() => {
    actions.checkPasswordInit();
  }, []);

  // Load profiles when unlocked
  useEffect(() => {
    if (state.unlocked) {
      actions.loadProfiles();
      // Refresh running profiles periodically
      const interval = setInterval(() => {
        actions.refreshRunningProfiles();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [state.unlocked]);

  // Show password gate if not unlocked
  if (!state.unlocked) {
    return <MasterPasswordGate mode={state.passwordInitialized ? 'unlock' : 'create'} />;
  }

  // Show loading
  if (state.loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f23' }}>
        <CircularProgress size={40} sx={{ color: '#6c63ff' }} />
      </Box>
    );
  }

  // Filter profiles
  const filteredProfiles = state.profiles.filter(p => {
    // Filter by browser type
    if (state.activeFilter !== 'all' && p.browserType !== state.activeFilter) return false;
    // Filter by search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) ||
        p.browserType.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto', background: '#0f0f23' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Profiles
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''}
              {state.runningProfiles.length > 0 && ` · ${state.runningProfiles.length} running`}
            </Typography>
          </Box>
        </Box>

        {/* Profile Grid */}
        {filteredProfiles.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No profiles yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Create a new profile to get started
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 2,
          }}>
            {filteredProfiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isRunning={state.runningProfiles.includes(profile.id)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* New Profile Dialog */}
      <NewProfileDialog />
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
