import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import HttpIcon from '@mui/icons-material/Http'
import VpnLockIcon from '@mui/icons-material/VpnLock'
import type { ProfileData, ProxyConfig, ProxyType } from '@shared/types'
import { SectionCard } from '../SectionCard'
import { useToast } from '../../hooks/useToasts'

const PROXY_TYPES: Array<{ value: ProxyType; label: string; icon: React.ReactNode }> = [
  { value: 'http', label: 'HTTP', icon: <HttpIcon sx={{ fontSize: 16 }} /> },
  { value: 'https', label: 'HTTPS', icon: <VpnLockIcon sx={{ fontSize: 16 }} /> },
  { value: 'socks5', label: 'SOCKS5', icon: <VpnLockIcon sx={{ fontSize: 16 }} /> },
  { value: 'socks4', label: 'SOCKS4', icon: <VpnLockIcon sx={{ fontSize: 16 }} /> }
]

/** Country code → flag emoji lookup. */
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  const base = 0x1F1E5
  return String.fromCodePoint(base + code.charCodeAt(0) - 65) + String.fromCodePoint(base + code.charCodeAt(1) - 65)
}

/** The Proxy tab: configure + test a per-profile proxy. */
export function ProxyTab({
  profile,
  setProfile
}: {
  profile: ProfileData
  setProfile: (patch: Partial<ProfileData>) => void
}): React.JSX.Element {
  const toast = useToast()
  const proxy = profile.proxy
  const setProxy = (patch: Partial<ProxyConfig>): void => setProfile({ proxy: { ...proxy, ...patch } })
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    ip: string
    country: string
    latencyMs: number
    text: string
  } | null>(null)

  const runTest = async (): Promise<void> => {
    setTesting(true)
    setResult(null)
    try {
      const res = await window.stealth.testProxy(proxy)
      if (res.ok) {
        const geo = [res.country, res.region, res.city].filter(Boolean).join(', ')
        setResult({
          ok: true,
          ip: res.ip,
          country: res.country,
          latencyMs: res.latencyMs,
          text: `${res.ip}${geo ? ' · ' + geo : ''}${res.isp ? ' · ' + res.isp : ''}`
        })
        toast.success('Proxy test passed')
      } else {
        setResult({ ok: false, ip: '', country: '', latencyMs: 0, text: `Failed: ${res.error}` })
        toast.error('Proxy test failed')
      }
    } catch (e) {
      setResult({ ok: false, ip: '', country: '', latencyMs: 0, text: String(e) })
      toast.error(String(e))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Box>
      <SectionCard
        title="Proxy settings"
        subtitle="Per-profile proxy"
      >
        <Stack spacing={1.5}>
          <FormControlLabel
            control={<Switch checked={proxy.enabled} onChange={(e) => setProxy({ enabled: e.target.checked })} size="small" />}
            label="Enable proxy"
          />

          {proxy.enabled && (
            <>
              <Stack direction="row" spacing={1.5}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    label="Type"
                    value={proxy.type}
                    onChange={(e) => setProxy({ type: e.target.value as ProxyType })}
                  >
                    {PROXY_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          {t.icon}
                          <span>{t.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Host"
                  size="small"
                  fullWidth
                  value={proxy.host}
                  onChange={(e) => setProxy({ host: e.target.value })}
                  placeholder="127.0.0.1"
                />
                <TextField
                  label="Port"
                  size="small"
                  fullWidth
                  type="number"
                  value={proxy.port || ''}
                  onChange={(e) => setProxy({ port: Number(e.target.value) })}
                />
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="Username"
                  size="small"
                  fullWidth
                  value={proxy.username}
                  onChange={(e) => setProxy({ username: e.target.value })}
                />
                <TextField
                  label="Password"
                  size="small"
                  fullWidth
                  type="password"
                  value={proxy.password}
                  onChange={(e) => setProxy({ password: e.target.value })}
                />
              </Stack>
              <TextField
                label="PAC URL or file path (optional, overrides all)"
                size="small"
                fullWidth
                value={proxy.pacUrl}
                onChange={(e) => setProxy({ pacUrl: e.target.value })}
                placeholder="http://…/proxy.pac  or  C:\proxy.pac"
              />

              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={14} /> : <TravelExploreIcon />}
                  disabled={testing}
                  onClick={() => void runTest()}
                >
                  {testing ? 'Testing…' : 'Test'}
                </Button>
                {result && (
                  <Alert
                    severity={result.ok ? 'success' : 'error'}
                    sx={{ flex: 1, borderRadius: 2, py: 0, '& .MuiAlert-message': { display: 'flex', alignItems: 'center', gap: 0.5 } }}
                  >
                    {result.ok && result.country && (
                      <span>{countryFlag(result.country)} </span>
                    )}
                    {result.ok && (
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {result.latencyMs}ms
                      </Typography>
                    )}
                    {' '}
                    {result.text}
                  </Alert>
                )}
              </Stack>

              <Alert severity="info" sx={{ borderRadius: 2, py: 0 }}>
                <Typography variant="caption">
                  Test resolves exit IP via ip-api.com. WebRTC leaks are blocked by the stealth extension.
                </Typography>
              </Alert>
            </>
          )}
        </Stack>
      </SectionCard>

      <SectionCard title="How proxy deployment works">
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          <b>HTTP/S no auth</b> → <code>--proxy-server</code> &nbsp;·&nbsp;
          <b>HTTP/S with auth</b> → local relay &nbsp;·&nbsp;
          <b>SOCKS</b> → direct; auth via relay &nbsp;·&nbsp;
          <b>PAC</b> → built-in PAC server
        </Typography>
      </SectionCard>
    </Box>
  )
}
