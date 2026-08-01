// ============================================================
// Joe Browser - New Profile Dialog
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  Autocomplete,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { BrowserType, DeviceType, OsType, NewProfileInput, BROWSER_THEMES } from '../../../shared/types';
import BrowserIcon from './BrowserIcon';
import { useApp } from '../store';

const browserTypes: { value: BrowserType; label: string }[] = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'brave', label: 'Brave' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'edge', label: 'Edge' },
  { value: 'chromium', label: 'Chromium' },
];

const deviceTypes: { value: DeviceType; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
];

const osOptions: { value: OsType; label: string; device: DeviceType }[] = [
  { value: 'windows', label: 'Windows', device: 'desktop' },
  { value: 'macos', label: 'macOS', device: 'desktop' },
  { value: 'linux', label: 'Linux', device: 'desktop' },
  { value: 'android', label: 'Android', device: 'mobile' },
  { value: 'ios', label: 'iOS', device: 'mobile' },
];

const proxyTypes = ['http', 'https', 'socks4', 'socks5'] as const;

const NewProfileDialog: React.FC = () => {
  const { actions } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [browserType, setBrowserType] = useState<BrowserType>('chrome');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [os, setOs] = useState<OsType>('windows');
  const [launchUrl, setLaunchUrl] = useState('https://www.google.com');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyType, setProxyType] = useState<'http' | 'https' | 'socks4' | 'socks5'>('http');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  // Listen for open event from Sidebar
  useEffect(() => {
    const handler = () => {
      resetForm();
      setOpen(true);
    };
    window.addEventListener('open-new-profile', handler);
    return () => window.removeEventListener('open-new-profile', handler);
  }, []);

  const resetForm = () => {
    setName('');
    setBrowserType('chrome');
    setDeviceType('desktop');
    setOs('windows');
    setLaunchUrl('https://www.google.com');
    setTags([]);
    setTagInput('');
    setUseProxy(false);
    setProxyType('http');
    setProxyHost('');
    setProxyPort('');
    setProxyUsername('');
    setProxyPassword('');
  };

  const handleDeviceTypeChange = (device: DeviceType) => {
    setDeviceType(device);
    // Auto-select appropriate OS
    if (device === 'mobile' && (os === 'windows' || os === 'macos' || os === 'linux')) {
      setOs('android');
    } else if (device === 'desktop' && (os === 'android' || os === 'ios')) {
      setOs('windows');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const input: NewProfileInput = {
        name: name || undefined,
        browserType,
        deviceType,
        os,
        launchUrl,
        tags,
        proxy: useProxy && proxyHost && proxyPort ? {
          host: proxyHost,
          port: parseInt(proxyPort),
          username: proxyUsername || undefined,
          password: proxyPassword || undefined,
          type: proxyType,
        } : undefined,
      };

      const result = await actions.createProfile(input);
      if (result) {
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOsOptions = osOptions.filter(o => o.device === deviceType);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BrowserIcon browser={browserType} size={24} />
          <Typography variant="h6" fontWeight={600}>Create New Profile</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Profile Name */}
          <TextField
            label="Profile Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${BROWSER_THEMES[browserType].name} Profile`}
            fullWidth
            size="small"
          />

          {/* Browser Type */}
          <FormControl size="small" fullWidth>
            <InputLabel>Browser Type</InputLabel>
            <Select
              value={browserType}
              label="Browser Type"
              onChange={(e) => setBrowserType(e.target.value as BrowserType)}
            >
              {browserTypes.map(bt => (
                <MenuItem key={bt.value} value={bt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BrowserIcon browser={bt.value} size={18} />
                    {bt.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Device Type + OS */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Device</InputLabel>
              <Select
                value={deviceType}
                label="Device"
                onChange={(e) => handleDeviceTypeChange(e.target.value as DeviceType)}
              >
                {deviceTypes.map(dt => (
                  <MenuItem key={dt.value} value={dt.value}>{dt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>OS</InputLabel>
              <Select
                value={os}
                label="OS"
                onChange={(e) => setOs(e.target.value as OsType)}
              >
                {filteredOsOptions.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Launch URL */}
          <TextField
            label="Launch URL"
            value={launchUrl}
            onChange={(e) => setLaunchUrl(e.target.value)}
            placeholder="https://www.google.com"
            fullWidth
            size="small"
          />

          {/* Tags */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_, newValue) => setTags(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Add tags" size="small" />
            )}
          />

          {/* Proxy */}
          <Box>
            <FormControlLabel
              control={<Switch checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Use Proxy</Typography>}
            />
            {useProxy && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={proxyType} label="Type" onChange={(e) => setProxyType(e.target.value as any)}>
                      {proxyTypes.map(pt => (
                        <MenuItem key={pt} value={pt}>{pt.toUpperCase()}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Host" value={proxyHost} onChange={(e) => setProxyHost(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Port" value={proxyPort} onChange={(e) => setProxyPort(e.target.value)} size="small" sx={{ width: 80 }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField label="Username" value={proxyUsername} onChange={(e) => setProxyUsername(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Password" value={proxyPassword} onChange={(e) => setProxyPassword(e.target.value)} size="small" type="password" sx={{ flex: 1 }} />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={loading}>
          Create Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProfileDialog;
