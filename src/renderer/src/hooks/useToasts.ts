import { useApp } from '../store'

/** Convenience wrapper around the store's toast action. */
export function useToast(): {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
} {
  const { toast } = useApp()
  return {
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info')
  }
}
