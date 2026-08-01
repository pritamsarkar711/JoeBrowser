import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
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
  const { draft, setDraft, replaceDraft, dirty, save, reset } = useProfileDraft(profile)
  const [tab, setTab] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
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
        // Keep the store in sync so the sidebar and future re-selects are fresh.
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
          gap: 2,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <BrowserIcon type={draft.browserType} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6"  noWrap sx={{ fontWeight: 700 }}>
            {draft.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {draft.browserType} profile · updated {new Date(draft.updatedAt).toLocaleString()}
          </Typography>
        </Box>
        <Tooltip title="Duplicate profile">
          <IconButton onClick={() => void duplicateProfile(draft.id)}>
            <ContentCopyIcon />
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
          disabled={!dirty || saving}
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
        sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label={t('tab.fingerprint', undefined, lang)} />
        <Tab label={t('tab.proxy', undefined, lang)} />
        <Tab label={t('tab.advanced', undefined, lang)} />
        <Tab label={t('tab.launch', undefined, lang)} />
      </Tabs>

      {/* Dirty banner */}
      {dirty && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          {t('common.unsaved', undefined, lang)} — click “Save changes” to persist.
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
    </Box>
  )
}
