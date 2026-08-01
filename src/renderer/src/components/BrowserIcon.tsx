import type { BrowserType } from '@shared/types'

interface Props {
  type: BrowserType
  size?: number
}

/** Realistic browser icons as SVG. */
export function BrowserIcon({ type, size = 20 }: Props): React.JSX.Element {
  const s = size
  switch (type) {
    case 'chrome':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#4285F4"/>
          <path d="M24 13a11 11 0 0 0-9.53 5.5l5.5 9.53A5.5 5.5 0 0 1 24 18.5z" fill="#DB4437"/>
          <path d="M14.47 18.5A11 11 0 0 0 19.97 35l5.5-9.53a5.5 5.5 0 0 1-5.5-2.44z" fill="#0F9D58"/>
          <path d="M19.97 35a11 11 0 0 0 13.56-5.5l-5.5-9.53a5.5 5.5 0 0 1-2.56 7.44z" fill="#F4B400"/>
          <circle cx="24" cy="24" r="7" fill="#fff"/>
          <circle cx="24" cy="24" r="5.5" fill="#4285F4"/>
        </svg>
      )
    case 'edge':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#0078D4"/>
          <path d="M24 8c-8 0-14 5.5-14 13 0 4 2 7.5 5 10l5-5c-2-1.5-3-4-3-6.5 0-5 3.5-8 8-8 2 0 4 .5 5.5 2C29 10 26.5 8 24 8z" fill="#50E6FF"/>
          <path d="M34 24c0 6-4.5 10-10 10-2 0-4-.5-5.5-1.5L13 38c3 2.5 7 4 11 4 8 0 14-5.5 14-13 0-2-.5-3.5-1-5h-3z" fill="#fff"/>
        </svg>
      )
    case 'brave':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#FB542B"/>
          <path d="M24 10l-9 5-2 10 5 8 6 3 6-3 5-8-2-10z" fill="#fff" opacity="0.95"/>
          <path d="M24 13l-6 3.5-1.5 7 3.5 5.5 4 2 4-2 3.5-5.5-1.5-7z" fill="#FB542B"/>
          <path d="M21 20l3 3 3-3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      )
    case 'firefox':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#FF7139"/>
          <path d="M24 6c-3 4-2 9 1 12 3 4 6 7 6 12 0 6-5 10-10 10S10 36 10 30c0-4 2-7 4-9-1 3 0 6 2 8 3 2 6 1 7-2 1-4-1-7-3-10-2-4-1-9 3-13 1 4 5 6 8 6 4 0 7-3 7-7 0-3-1-5-4-6 3 0 5 2 6 4 1-3 0-6-2-8-3-1-6 0-8 3z" fill="#FFD567"/>
          <path d="M24 6c-3 4-2 9 1 12 3 4 6 7 6 12 0 6-5 10-10 10S10 36 10 30c0-4 2-7 4-9-1 3 0 6 2 8 3 2 6 1 7-2 1-4-1-7-3-10-2-4-1-9 3-13 1 4 5 6 8 6 4 0 7-3 7-7 0-3-1-5-4-6 3 0 5 2 6 4 1-3 0-6-2-8-3-1-6 0-8 3z" fill="#FFD567" opacity="0.5"/>
          <circle cx="24" cy="24" r="8" fill="#FF7139"/>
          <circle cx="24" cy="24" r="5" fill="#1a1a2e"/>
          <circle cx="24" cy="24" r="3" fill="#FF7139"/>
        </svg>
      )
    case 'chromium':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#4285F4"/>
          <path d="M24 13a11 11 0 0 0-9.53 5.5l5.5 9.53A5.5 5.5 0 0 1 24 18.5z" fill="#DB4437" opacity="0.6"/>
          <path d="M14.47 18.5A11 11 0 0 0 19.97 35l5.5-9.53a5.5 5.5 0 0 1-5.5-2.44z" fill="#0F9D58" opacity="0.6"/>
          <path d="M19.97 35a11 11 0 0 0 13.56-5.5l-5.5-9.53a5.5 5.5 0 0 1-2.56 7.44z" fill="#F4B400" opacity="0.6"/>
          <circle cx="24" cy="24" r="8" fill="#fff" opacity="0.3"/>
          <circle cx="24" cy="24" r="6" fill="#4285F4"/>
        </svg>
      )
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#666"/>
          <circle cx="24" cy="24" r="7" fill="#fff"/>
        </svg>
      )
  }
}
