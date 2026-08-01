import type { BrowserType } from '@shared/types'

/** Realistic browser logos as inline SVG — matching actual brand icons. */
export function BrowserIcon({
  type,
  size = 28
}: {
  type: BrowserType
  size?: number
}): React.JSX.Element {
  const common = { width: size, height: size, viewBox: '0 0 48 48' }
  switch (type) {
    case 'chrome':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="22" fill="#fff" />
          <circle cx="24" cy="24" r="9" fill="#4285F4" />
          <path d="M24 15a9 9 0 0 1 7.79 4.5l-7.79 4.5z" fill="#fff" opacity="0.3" />
          <path d="M24 24 L43.5 12 A22 22 0 0 0 24 2 Z" fill="#EA4335" />
          <path d="M24 24 L43.5 12 A22 22 0 0 1 43.5 36 Z" fill="#FBBC05" />
          <path d="M24 24 L43.5 36 A22 22 0 0 1 4.5 36 Z" fill="#34A853" />
          <path d="M24 24 L4.5 36 A22 22 0 0 1 4.5 12 Z" fill="#EA4335" />
          <path d="M24 24 L4.5 12 A22 22 0 0 1 43.5 12 Z" fill="#FBBC05" />
          <circle cx="24" cy="24" r="9" fill="#4285F4" />
          <circle cx="24" cy="24" r="6" fill="#fff" />
          <circle cx="24" cy="24" r="4.5" fill="#4285F4" />
        </svg>
      )
    case 'edge':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0C59A4" />
              <stop offset="100%" stopColor="#114A8B" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="22" fill="url(#edgeGrad)" />
          <path
            d="M24 6C16 6 9 11 7 18c2-4 6-7 10-7 3 0 5 1 7 3 2 2 3 4 3 7 0 2-1 4-2 6-1 1-3 2-5 2-3 0-5-2-5-5 0-2 1-4 3-5-2 0-4 1-5 3-2 2-2 5-2 8 1 6 7 11 13 11 8 0 14-6 14-14 0-2-1-5-2-7-2-4-6-7-10-8-1 0-2-1-3-1-1 0-2 0-3 1z"
            fill="#fff"
            opacity="0.95"
          />
        </svg>
      )
    case 'brave':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="22" fill="#FB542B" />
          <path
            d="M24 8l-6 3-4-1 1 5-5 5 3 8 3 2 3-1 2 2 3-2 3 1 3-2 3-8-5-5 1-5-4 1z"
            fill="#fff"
            opacity="0.95"
          />
          <path
            d="M24 12l-4 2-2-0.5 0.5 3-3 3 2 5 2 1 2-1 2 1 2-1 2-5-3-3 0.5-3-2 0.5z"
            fill="#FB542B"
          />
          <path d="M20 18l4 4 4-4" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="22" r="2" fill="#fff" />
        </svg>
      )
    case 'chromium':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="22" fill="#4285F4" />
          <path d="M24 24 L43.5 12 A22 22 0 0 0 24 2 Z" fill="#EA4335" />
          <path d="M24 24 L43.5 36 A22 22 0 0 1 4.5 36 Z" fill="#34A853" />
          <path d="M24 24 L4.5 36 A22 22 0 0 1 4.5 12 Z" fill="#FBBC05" />
          <path d="M24 24 L4.5 12 A22 22 0 0 1 43.5 12 Z" fill="#EA4335" />
          <circle cx="24" cy="24" r="9" fill="#4285F4" />
          <circle cx="24" cy="24" r="6" fill="#fff" />
          <circle cx="24" cy="24" r="4.5" fill="#4285F4" />
          <circle cx="24" cy="24" r="15" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
        </svg>
      )
    case 'firefox':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="ffGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9500" />
              <stop offset="50%" stopColor="#FF6611" />
              <stop offset="100%" stopColor="#E03C31" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="22" fill="url(#ffGrad)" />
          <path
            d="M32 16c-1-3-3-5-5-6 1 2 1 3 1 5-2-3-5-5-8-5 1 1 2 3 2 5-2-2-4-3-7-3 2 2 3 4 3 6-1-1-3-1-4-1 1 1 2 3 2 4l-1 2c-1 3-1 5 0 8 1 3 3 5 6 7 1 1 2 1 3 1s2 0 3-1c3-2 5-4 6-7 1-3 1-5 0-8l-1-2c0-1 1-3 2-4-1 0-3 0-4 1 0-2 1-4 3-6-3 0-5 1-7 3 0-2 1-4 2-5-3 0-6 2-8 5 0-2 0-3 1-5-2 1-4 3-5 6"
            fill="#fff"
            opacity="0.95"
          />
          <path
            d="M28 28c-1 2-3 3-5 3-1 0-2-1-3-2 0 0 1-1 2-1 1 0 2 0 3-1 1-1 2-2 2-3 0-1 0-2-1-3 1 0 2 1 2 2 1 1 1 3 0 5z"
            fill="#FF6611"
            opacity="0.8"
          />
        </svg>
      )
  }
}
