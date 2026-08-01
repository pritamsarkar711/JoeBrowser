import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

type ReleaseAsset = {
  name: string
  size: number
  download_count: number
  browser_download_url: string
}

type ReleaseInfo = {
  tag_name: string
  name: string
  published_at: string
  html_url: string
  assets: ReleaseAsset[]
  body?: string
}

const OWNER = 'pritamsarkar711'
const REPO = 'JoeBrowser'

export function DownloadDialog({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [release, setRelease] = useState<ReleaseInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const currentVersion = '1.0.2' // keep in sync with package.json

  const fetchRelease = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' }
      })
      if (!res.ok) {
        if (res.status === 404) throw new Error('No releases published yet. Build one locally or trigger CI.')
        throw new Error(`GitHub API ${res.status}`)
      }
      const data = (await res.json()) as ReleaseInfo
      setRelease(data)
    } catch (e) {
      setError(String(e))
      setRelease(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void fetchRelease()
  }, [open])

  const installer = release?.assets.find((a) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe'))
  const portable = release?.assets.find((a) => a.name.toLowerCase().includes('portable') && a.name.endsWith('.exe'))

  const openExternal = (url: string) => {
    // In Electron, window.open with https is intercepted and opened in default browser via main process handler
    window.open(url, '_blank')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DownloadIcon /> Download JoeBrowser (.exe)
        <Chip label={`v${currentVersion} (local)`} size="small" sx={{ ml: 1 }} />
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="info" icon={<CheckCircleIcon />}>
            You are running JoeBrowser from source / dev build. Download the Windows .exe installer for easy installation on other PCs.
          </Alert>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Direct Download from GitHub Releases
            </Typography>

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Checking latest release on GitHub...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1.5 }}>
                {error}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    No release? You have 3 ways to get the exe: build locally (<code>npm run dist:win</code>), trigger the GitHub Action workflow, or download source.
                  </Typography>
                </Box>
              </Alert>
            )}

            {release && (
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {release.tag_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    • {new Date(release.published_at).toLocaleDateString()} • {release.assets.length} files
                  </Typography>
                  <Chip size="small" label={`${release.assets.reduce((s, a) => s + a.download_count, 0)} downloads`} variant="outlined" />
                </Stack>
              </Box>
            )}

            <Stack spacing={1.2}>
              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                endIcon={<OpenInNewIcon />}
                disabled={!!(release && !installer) && !loading}
                onClick={() => openExternal(installer?.browser_download_url ?? `https://github.com/${OWNER}/${REPO}/releases/latest`)}
                sx={{ justifyContent: 'flex-start', py: 1.5, borderRadius: 3 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="button" sx={{ display: 'block', fontWeight: 700 }}>
                    Download Installer .exe
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'none' }}>
                    {installer ? `${installer.name} • ${(installer.size / 1024 / 1024).toFixed(1)} MB` : 'JoeBrowser-Setup-1.0.2.exe • ~110 MB • NSIS installer (recommended)'}
                  </Typography>
                </Box>
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<DownloadIcon />}
                endIcon={<OpenInNewIcon />}
                disabled={!!(release && !portable) && !loading}
                onClick={() => openExternal(portable?.browser_download_url ?? `https://github.com/${OWNER}/${REPO}/releases/latest`)}
                sx={{ justifyContent: 'flex-start', py: 1.5, borderRadius: 3 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="button" sx={{ display: 'block', fontWeight: 700 }}>
                    Download Portable .exe
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'none' }}>
                    {portable ? `${portable.name} • ${(portable.size / 1024 / 1024).toFixed(1)} MB` : 'JoeBrowser-Portable-1.0.2.exe • ~110 MB • No install needed'}
                  </Typography>
                </Box>
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Other ways to get the EXE
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                <b>1) Build locally on Windows (2 min):</b>
              </Typography>
              <Box component="pre" sx={{ bgcolor: '#00000010', p: 1, borderRadius: 1, fontSize: 11, overflowX: 'auto', m: 0 }}>
                git clone https://github.com/{OWNER}/{REPO}.git{'\n'}cd {REPO}{'\n'}npm ci{'\n'}npm run dist:win{'\n'}# exe appears in /release/
              </Box>
              <Typography variant="body2" color="text.secondary">
                Or double-click <code>scripts/build-windows.bat</code> on Windows.
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <b>2) Trigger CI build on GitHub:</b>
              </Typography>
              <Box component="pre" sx={{ bgcolor: '#00000010', p: 1, borderRadius: 1, fontSize: 11, overflowX: 'auto', m: 0 }}>
                git tag v1.0.2{'\n'}git push origin v1.0.2{'\n'}# Wait 8-12 min → Releases page gets exe
              </Box>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                <Button size="small" variant="text" endIcon={<OpenInNewIcon />} onClick={() => openExternal(`https://github.com/${OWNER}/${REPO}/releases`)}>
                  All Releases
                </Button>
                <Button size="small" variant="text" endIcon={<OpenInNewIcon />} onClick={() => openExternal(`https://github.com/${OWNER}/${REPO}/actions/workflows/build-windows.yml`)}>
                  CI Build Status
                </Button>
                <Button size="small" variant="text" endIcon={<OpenInNewIcon />} onClick={() => openExternal(`https://github.com/${OWNER}/${REPO}/archive/refs/heads/main.zip`)}>
                  Source ZIP
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Alert severity="warning" variant="outlined">
            <b>Windows shows "Windows protected your PC" or blocks the EXE?</b> The app is not code-signed, so SmartScreen
            will warn on first run — click <b>More info → Run anyway</b>. If Windows Defender quarantines the file, click
            <b> Allow on device</b> (or add an exclusion in Windows Security → Virus &amp; threat protection). See the
            README "Windows won't open the EXE?" section for details.
          </Alert>

          <Alert severity="success" variant="outlined">
            Tip: Portable version needs no admin rights — run from USB stick. Installer version creates desktop & start-menu shortcuts.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => void fetchRelease()} disabled={loading}>
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  )
}
