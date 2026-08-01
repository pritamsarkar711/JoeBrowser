import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
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
      if (dirty) await save()
      const json = await window.stealth.exportProfile(draft.id, exportPw)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `joe-profile-${draft.name.replace(/[^\w.-]+/g, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportOpen(false)
      setExportPw('')
      toastHook.success('Exported')
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
      toastHook.success(`Imported "${imported.name}"`)
    } catch (e) {
      toastHook.error(String(e))
    }
  }

  const pickImportFile = async (): Promise<void> => {
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <BrowserIcon type={draft.browserType} size={32} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
            {draft.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10 }}>
            {draft.browserType} · {autoSaving ? 'saving...' : dirty ? 'unsaved' : 'saved'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Tooltip title="Duplicate">
            <IconButton size="small" onClick={() => void duplicateProfile(draft.id)}>
              <ContentCopyIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton size="small" onClick={() => setExportOpen(true)}>
              <FileDownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Import">
            <IconButton size="small" onClick={() => setImportOpen(true)}>
              <FileUploadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)}>
              <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!dirty || saving || autoSaving}
            onClick={() => void handleSave()}
            sx={{ fontSize: 12 }}
          >
            Save
          </Button>
          <Tooltip title="Discard">
            <span>
              <IconButton size="small" disabled={!dirty} onClick={reset}>
                <UndoIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: 12, px: 1.5 }
        }}
      >
        <Tab label="Fingerprint" />
        <Tab label="Proxy" />
        <Tab label="Advanced" />
        <Tab label="Launch" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          {tab === 0 && <FingerprintTab profile={draft} setProfile={setDraft} />}
          {tab === 1 && <ProxyTab profile={draft} setProfile={setDraft} />}
          {tab === 2 && <AdvancedTab profile={draft} setProfile={setDraft} />}
          {tab === 3 && <LaunchTab profile={draft} />}
        </Box>
      </Box>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete profile?"
        message={`Delete "${draft.name}"? This cannot be undone.`}
        onConfirm={() => void deleteProfile(draft.id)}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Export dialog */}
      {exportOpen && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 3, maxWidth: 400, width: '90%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Export encrypted profile</Typography>
            <TextField
              autoFocus
              fullWidth
              type="password"
              label="Password (min 4 chars)"
              size="small"
              value={exportPw}
              onChange={(e) => setExportPw(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setExportOpen(false)}>Cancel</Button>
              <Button size="small" variant="contained" disabled={exportPw.length < 4} onClick={() => void handleExport()}>
                Export
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Import dialog */}
      {importOpen && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 3, maxWidth: 500, width: '90%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Import profile</Typography>
            <Stack spacing={1.5}>
              <Button variant="outlined" size="small" onClick={() => void pickImportFile()}>
                Choose .json file
              </Button>
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                label="Or paste JSON"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
              />
              <TextField
                fullWidth
                type="password"
                label="Password"
                size="small"
                value={importPw}
                onChange={(e) => setImportPw(e.target.value)}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button size="small" variant="contained" disabled={!importJson.trim() || !importPw} onClick={() => void handleImport()}>
                  Import
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  )
}
