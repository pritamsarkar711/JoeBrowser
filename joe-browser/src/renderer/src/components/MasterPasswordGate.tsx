// ============================================================
// Joe Browser - Master Password Gate
// Lock screen shown before accessing the app
// ============================================================

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { useApp } from '../store';

interface MasterPasswordGateProps {
  mode: 'create' | 'unlock';
}

const MasterPasswordGate: React.FC<MasterPasswordGateProps> = ({ mode }) => {
  const { actions } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'create') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await window.joeAPI.masterPassword.change(password);
        await actions.unlock(password);
      } else {
        const success = await actions.unlock(password);
        if (!success) {
          setError('Incorrect password');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0f0f23 70%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: 380,
          borderRadius: 3,
          border: '1px solid #2a2a3e',
          background: '#1a1a2e',
        }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6c63ff 0%, #4a42d4 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.5rem',
              color: 'white',
              mb: 2,
            }}
          >
            JB
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {mode === 'create' ? 'Set Master Password' : 'Unlock Joe Browser'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mode === 'create'
              ? 'Create a password to protect your profiles'
              : 'Enter your master password to continue'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          type={showPassword ? 'text' : 'password'}
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <VpnKeyIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
          autoFocus
        />

        {mode === 'create' && (
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            sx={{ mb: 2 }}
          />
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !password}
          sx={{ py: 1.2, mt: 1 }}
        >
          {mode === 'create' ? 'Create Password' : 'Unlock'}
        </Button>
      </Paper>
    </Box>
  );
};

export default MasterPasswordGate;
