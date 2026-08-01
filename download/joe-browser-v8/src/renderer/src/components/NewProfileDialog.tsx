// ============================================================
// Joe Browser - New Profile Dialog
// Create a new browser profile
// ============================================================

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import {
  Computer as DesktopIcon,
  Smartphone as MobileIcon,
} from '@mui/icons-material';
import { BrowserType, DeviceType, OsType, NewProfileInput, BROWSER_THEMES } from '../../../shared/types';
import BrowserIcon from './BrowserIcon';

interface NewProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewProfileInput) => Promise<void>;
}

const NewProfileDialog: React.FC<NewProfileDialogProps> = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [browserType, setBrowserType] = useState<BrowserType>('chrome');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [os, setOs] = useState<OsType>('windows');
  const [launchUrl, setLaunchUrl] = useState('https://iphey.com');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyType, setProxyType] = useState<'http' | 'https' | 'socks5'>('http');
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPass, setProxyPass] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  const osOptions: { value: OsType; label: string; mobile?: boolean }[] = [
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS' },
    { value: 'linux', label: 'Linux' },
    { value: 'android', label: 'Android', mobile: true },
    { value: 'ios', label: 'iOS', mobile: true },
  ];

  const filteredOsOptions = osOptions.filter(
    (o) => deviceType === 'mobile' ? !!o.mobile : !o.mobile,
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const input: NewProfileInput = {
        name: name || undefined,
        browserType,
        deviceType,
        os,
        launchUrl: launchUrl || 'https://iphey.com',
        tags,
        proxy: proxyHost
          ? {
              host: proxyHost,
              port: parseInt(proxyPort) || 8080,
              type: proxyType,
              username: proxyUser || undefined,
              password: proxyPass || undefined,
            }
          : undefined,
      };

      await onSubmit(input);
      handleClose();
    } catch (err) {
      console.error('Failed to create profile:', err);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setName('');
    setBrowserType('chrome');
    setDeviceType('desktop');
    setOs('windows');
    setLaunchUrl('https://iphey.com');
    setProxyHost('');
    setProxyPort('');
    setProxyUser('');
    setProxyPass('');
    setTags([]);
    setTagInput('');
    onClose();
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          New Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create a new browser profile with custom fingerprint
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Profile Name */}
        <TextField
          fullWidth
          label="Profile Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leave empty for auto-generated name"
          sx={{ mb: 2.5 }}
          size="small"
        />

        {/* Browser Type Selection */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Browser Type
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          {(Object.keys(BROWSER_THEMES) as BrowserType[]).map((bt) => (
            <Chip
              key={bt}
              icon={<BrowserIcon browser={bt} size={16} />}
              label={BROWSER_THEMES[bt].name}
              onClick={() => setBrowserType(bt)}
              variant={browserType === bt ? 'filled' : 'outlined'}
              sx={{
                borderColor: browserType === bt ? BROWSER_THEMES[bt].primary : 'divider',
                bgcolor: browserType === bt ? `${BROWSER_THEMES[bt].primary}22` : 'transparent',
                color: browserType === bt ? BROWSER_THEMES[bt].primary : 'text.secondary',
                fontWeight: browserType === bt ? 600 : 400,
                '&:hover': {
                  bgcolor: `${BROWSER_THEMES[bt].primary}15`,
                  borderColor: BROWSER_THEMES[bt].primary,
                },
              }}
            />
          ))}
        </Box>

        {/* Device Type */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Device Type
        </Typography>
        <ToggleButtonGroup
          value={deviceType}
          exclusive
          onChange={(_, v) => {
            if (v) {
              setDeviceType(v);
              if (v === 'mobile') setOs('android');
              else setOs('windows');
            }
          }}
          size="small"
          sx={{ mb: 2.5 }}
        >
          <ToggleButton value="desktop" sx={{ px: 3 }}>
            <DesktopIcon sx={{ mr: 1, fontSize: 18 }} />
            Desktop
          </ToggleButton>
          <ToggleButton value="mobile" sx={{ px: 3 }}>
            <MobileIcon sx={{ mr: 1, fontSize: 18 }} />
            Mobile
          </ToggleButton>
        </ToggleButtonGroup>

        {/* OS Selection */}
        <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
          <InputLabel>Operating System</InputLabel>
          <Select
            value={os}
            label="Operating System"
            onChange={(e) => setOs(e.target.value as OsType)}
          >
            {filteredOsOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Launch URL */}
        <TextField
          fullWidth
          label="Launch URL"
          value={launchUrl}
          onChange={(e) => setLaunchUrl(e.target.value)}
          placeholder="https://iphey.com"
          sx={{ mb: 2.5 }}
          size="small"
        />

        {/* Proxy Configuration */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Proxy (Optional)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={proxyType}
              label="Type"
              onChange={(e) => setProxyType(e.target.value as any)}
            >
              <MenuItem value="http">HTTP</MenuItem>
              <MenuItem value="https">HTTPS</MenuItem>
              <MenuItem value="socks5">SOCKS5</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Host"
            value={proxyHost}
            onChange={(e) => setProxyHost(e.target.value)}
            placeholder="192.168.1.1"
            sx={{ flex: 1, minWidth: 120 }}
          />
          <TextField
            size="small"
            label="Port"
            value={proxyPort}
            onChange={(e) => setProxyPort(e.target.value)}
            placeholder="8080"
            sx={{ width: 90 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
          <TextField
            size="small"
            label="Username"
            value={proxyUser}
            onChange={(e) => setProxyUser(e.target.value)}
            placeholder="Optional"
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Password"
            type="password"
            value={proxyPass}
            onChange={(e) => setProxyPass(e.target.value)}
            placeholder="Optional"
            sx={{ flex: 1 }}
          />
        </Box>

        {/* Tags */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Tags
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onDelete={() => handleTagRemove(tag)}
              sx={{ bgcolor: 'primary.50' }}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTagAdd()}
            placeholder="Add tag..."
            sx={{ flex: 1 }}
          />
          <Button size="small" onClick={handleTagAdd} disabled={!tagInput.trim()}>
            Add
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            background: `linear-gradient(135deg, ${BROWSER_THEMES[browserType].primary}, ${BROWSER_THEMES[browserType].accent})`,
          }}
        >
          {loading ? 'Creating...' : 'Create Profile'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProfileDialog;
