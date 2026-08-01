import type { BrowserType } from '@shared/types'

/** Simple recognizable browser logos as inline SVG (no external assets). */
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
          <circle cx="24" cy="24" r="22" fill="none" stroke="#e8eaed" strokeWidth="1" />
          <circle cx="24" cy="24" r="9" fill="#4285F4" />
          <path d="M24 24 L43.5 12 A22 22 0 0 0 24 2 Z" fill="#EA4335" />
          <path d="M24 24 L5 34 A22 22 0 0 0 42.2 37.8 L40 24 Z" fill="#FBBC05" />
          <path d="M24 24 L8 14.2 A22 22 0 0 0 4 24 Z" fill="#34A853" />
        </svg>
      )
    case 'edge':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="22" fill="#fff" />
          <circle cx="24" cy="24" r="22" fill="none" stroke="#e8eaed" strokeWidth="1" />
          <path
            d="M40 27c0 9-7 16-16.5 16C13 43 6 35 6 26c0-6 4-11 9-13-2 3-2 7 1 10 1 1 1 2 0 3-1 1-3 1-3 0-1-1-2-4-1-7-6 3-9 9-9 15 0 11 8 19 19 19 11 0 19-8 19-19 0-3 0-6-1-8v-3c-1 3-3 5-5 5-2 0-3-1-3-3 0-6-5-11-11-11-5 0-9 3-11 7 7-3 14-1 17 4 0-7-5-12-12-14-8-3-16 0-20 7l5-8c8-7 20-5 27 4 3 5 5 11 5 17z"
            fill="#0078D4"
          />
        </svg>
      )
    case 'brave':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="22" fill="#fff" />
          <circle cx="24" cy="24" r="22" fill="none" stroke="#e8eaed" strokeWidth="1" />
          <path
            d="M24 5l8 5 6-1-1 8 7 7-14 16L16 30 2 24l7-7-1-8 6 1z"
            fill="#FB542B"
          />
          <path d="M24 5l8 5 6-1-1 8 7 7-14 16z" fill="#FF7A3D" />
          <path
            d="M12 10l3 3-4 2 4 1-1 3 6 1-2 14 6-3z"
            fill="#FFB98A"
            opacity="0.9"
          />
        </svg>
      )
    case 'firefox':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="22" fill="#fff" />
          <circle cx="24" cy="24" r="22" fill="none" stroke="#e8eaed" strokeWidth="1" />
          <path
            d="M24 3c-4 0-7 1-9 3l-2-2 1 4c-4 3-6 8-6 13 0 10 8 21 16 21 9 0 14-8 14-16 0-5-2-9-4-11 0 2-1 4-2 5-2-6-7-10-12-12-3 2-5 4-6 7 3-3 6-5 10-5 2 0 4 1 4 1 3-4 2-7 0-8h-2c3 2 5 4 6 7 1-4 0-7-1-9-3 2-5 3-8 4-1-1-3-1-4-1-3 0-6 1-9 4 1-5 4-9 8-11-2 0-4 1-6 2-1-1-2-2-2-3 2-1 4-1 6-1z"
            fill="#FF7A3D"
          />
          <path d="M34 28c-1 4-4 8-8 9l2-2-4-1 4-2-2-2 5 1 2-3z" fill="#FFC36B" />
          <circle cx="32" cy="20" r="2" fill="#0A0A0A" opacity="0.7" />
        </svg>
      )
  }
}
