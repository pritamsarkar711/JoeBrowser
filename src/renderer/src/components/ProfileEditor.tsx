import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import type { ProfileData } from '@shared/types'
import { FingerprintTab } from './tabs/FingerprintTab'
import { ProxyTab } from './tabs/ProxyTab'
import { AdvancedTab } from './tabs/AdvancedTab'
import { LaunchTab } from './tabs/LaunchTab'
import { BrowserIcon } from './BrowserIcon'
import { ConfirmDialog } from './ConfirmDialog'
import { useProfileDraft } from '../hooks/useProfileDraft'
import { useApp } from '../store'
import { useToast } from '../hooks/useToasts'
import { t } from '../i18n'

export function ProfileEditor({ profile }: { profile: ProfileData }): React.JSX.Element {
  const { duplicateProfile, deleteProfile, settings, refreshProfiles } = useApp()
  const toastHook = useToast()
  const { draft, setDraft, replaceDraft, dirty, saving: autoSaving, save, reset } = useProfileDraft(
    profile,
    {
      onAutoSaved: () => {
        void refreshProfiles()
      },
      onAutoSaveError: (e) => toastHook.error(String(e))
    }
  )
  const [tab, setTab] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportPw, setExportPw] = useState('')
  const [importPw, setImportPw] = useState('')
  const [importJson, setImportJson] = useState('')
  const lang = settings?.language ?? 'en'

  // Reset to the newly selected profile when it changes.
  useEffect(() => {
    setTab(0)
  }, [profile.id])

  if (!draft) return <></>

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      const saved = await save()
      if (saved) {
        await refreshProfiles()
        replaceDraft(saved)
        toastHook.success(t('toast.saved', undefined, lang))
      }
    } catch (e) {
      toastHook.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (): Promise<void> => {
    try {
      // Flush dirty draft first so export has latest values.
      if (dirty) await save()
      const json = await window.stealth.exportProfile(draft.id, exportPw)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stealth-profile-${draft.name.replace(/[^\w.-]+/g, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportOpen(false)
      setExportPw('')
      toastHook.success('Encrypted profile export downloaded')
    } catch (e) {
      toastHook.error(String(e))
    }
  }

  const handleImport = async (): Promise<void> => {
    try {
      const imported = await window.stealth.importProfile(importJson, importPw)
      await refreshProfiles()
      setImportOpen(false)
      setImportPw('')
      setImportJson('')
      toastHook.success(`Imported profile “${imported.name}”`)
    } catch (e) {
      toastHook.error(String(e))
    }
  }

  const pickImportFile = async (): Promise<void> => {
    // Renderer can't read arbitrary files; use a file input.
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => setImportJson(String(reader.result ?? ''))
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap'
        }}
      >
        <BrowserIcon type={draft.browserType} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            {draft.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {draft.browserType} profile · updated {new Date(draft.updatedAt).toLocaleString()}
            {autoSaving ? ' · saving…' : dirty ? ' · unsaved' : ' · saved'}
          </Typography>
        </Box>
        <Tooltip title="Duplicate profile">
          <IconButton onClick={() => void duplicateProfile(draft.id)}>
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export encrypted JSON">
          <IconButton onClick={() => setExportOpen(true)}>
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Import encrypted JSON">
          <IconButton onClick={() => setImportOpen(true)}>
            <FileUploadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete profile">
          <IconButton color="error" onClick={() => setConfirmDelete(true)}>
            <DeleteOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!dirty || saving || autoSaving}
          onClick={() => void handleSave()}
        >
          {t('common.save', undefined, lang)}
        </Button>
        <Tooltip title="Discard changes">
          <span>
            <IconButton disabled={!dirty} onClick={reset}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label={t('tab.fingerprint', undefined, lang)} />
        <Tab label={t('tab.proxy', undefined, lang)} />
        <Tab label={t('tab.advanced', undefined, lang)} />
        <Tab label={t('tab.launch', undefined, lang)} />
      </Tabs>

      {/* Dirty banner */}
      {dirty && !autoSaving && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          Changes auto-save in a moment, or click “Save changes” to persist now.
        </Alert>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
          {tab === 0 && <FingerprintTab profile={draft} setProfile={setDraft} />}
          {tab === 1 && <ProxyTab profile={draft} setProfile={setDraft} />}
          {tab === 2 && <AdvancedTab profile={draft} setProfile={setDraft} />}
          {tab === 3 && <LaunchTab profile={draft} />}
        </Box>
      </Box>

      <ConfirmDialog
        open={confirmDelete}
        title={t('profile.delete', undefined, lang)}
        message={t('profile.deleteConfirm', { name: draft.name }, lang)}
        onConfirm={() => void deleteProfile(draft.id)}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Export dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Export encrypted profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The profile is encrypted with AES-256-GCM using a password you choose. Without this
            password the file is useless.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Export password"
            size="small"
            value={exportPw}
            onChange={(e) => setExportPw(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={exportPw.length < 4} onClick={() => void handleExport()}>
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Import encrypted profile</DialogTitle>
        <DialogContent>
          <Stackish>
            <Button variant="outlined" onClick={() => void pickImportFile()} sx={{ mb: 2 }}>
              Choose .json file…
            </Button>
            <TextField
              fullWidth
              multiline
              minRows={4}
              size="small"
              label="Or paste export JSON"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Import password"
              size="small"
              value={importPw}
              onChange={(e) => setImportPw(e.target.value)}
            />
          </Stackish>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!importJson.trim() || !importPw}
            onClick={() => void handleImport()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/** Tiny local helper so we don't need another MUI Stack import if tree-shaken oddly. */
function Stackish({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Box sx={{ pt: 1 }}>{children}</Box>
}
