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
import type { ProfileData, ProxyConfig, ProxyType } from '@shared/types'
import { SectionCard } from '../SectionCard'
import { useToast } from '../../hooks/useToasts'

const PROXY_TYPES: Array<{ value: ProxyType; label: string }> = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' },
  { value: 'socks4', label: 'SOCKS4' }
]

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
          text: `Proxy works — IP ${res.ip}${geo ? ' (' + geo + ')' : ''} · ${res.latencyMs} ms${res.isp ? ' · ' + res.isp : ''}`
        })
        toast.success('Proxy test passed')
      } else {
        setResult({ ok: false, text: `Proxy failed: ${res.error}` })
        toast.error('Proxy test failed')
      }
    } catch (e) {
      setResult({ ok: false, text: String(e) })
      toast.error(String(e))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Box>
      <SectionCard
        title="Proxy settings"
        subtitle="Applied per-profile at launch. SOCKS with auth runs through a local relay so credentials never reach the browser."
      >
        <Stack spacing={2}>
          <FormControlLabel
            control={<Switch checked={proxy.enabled} onChange={(e) => setProxy({ enabled: e.target.checked })} />}
            label="Enable proxy for this profile"
          />

          {proxy.enabled && (
            <>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    label="Type"
                    value={proxy.type}
                    onChange={(e) => setProxy({ type: e.target.value as ProxyType })}
                  >
                    {PROXY_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
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
                  placeholder="127.0.0.1 or proxy.example.com"
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
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Username (optional)"
                  size="small"
                  fullWidth
                  value={proxy.username}
                  onChange={(e) => setProxy({ username: e.target.value })}
                />
                <TextField
                  label="Password (optional)"
                  size="small"
                  fullWidth
                  type="password"
                  value={proxy.password}
                  onChange={(e) => setProxy({ password: e.target.value })}
                />
              </Stack>
              <TextField
                label="Custom PAC URL or .pac file path (optional, overrides everything)"
                size="small"
                fullWidth
                value={proxy.pacUrl}
                onChange={(e) => setProxy({ pacUrl: e.target.value })}
                placeholder="http://…/proxy.pac  or  C:\proxy.pac"
              />

              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={16} /> : <TravelExploreIcon />}
                  disabled={testing}
                  onClick={() => void runTest()}
                >
                  {testing ? 'Testing…' : 'Test proxy'}
                </Button>
                {result && (
                  <Alert severity={result.ok ? 'success' : 'error'} sx={{ flex: 1, borderRadius: 2 }}>
                    {result.text}
                  </Alert>
                )}
              </Stack>

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                The test resolves the proxy's exit IP and location (via ip-api.com) — the request itself goes
                through your proxy. WebRTC leaks are blocked by the stealth extension, so the browser cannot
                bypass the proxy.
              </Alert>
            </>
          )}
        </Stack>
      </SectionCard>

      <SectionCard title="How proxy deployment works">
        <Typography variant="body2" color="text.secondary">
          <b>HTTP/HTTPS without auth</b> → <code>--proxy-server</code> (Chromium) or manual prefs (Firefox).<br />
          <b>HTTP/HTTPS with auth</b> → local relay adds <code>Proxy-Authorization</code>, browser sees 127.0.0.1.<br />
          <b>SOCKS5/SOCKS4</b> → <code>socks5://host:port</code> directly; with auth a local SOCKS relay authenticates
          upstream.<br />
          <b>Custom PAC</b> → used verbatim; local .pac files are served by the built-in PAC server on 127.0.0.1.
        </Typography>
      </SectionCard>
    </Box>
  )
}
