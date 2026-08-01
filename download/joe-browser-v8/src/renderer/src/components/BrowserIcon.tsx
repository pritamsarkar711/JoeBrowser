// ============================================================
// Joe Browser - Browser Icon Component
// Real SVG icons for each browser type
// ============================================================

import React from 'react';
import { BrowserType } from '../../../shared/types';

interface BrowserIconProps {
  browser: BrowserType;
  size?: number;
  sx?: any;
}

const ChromeIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" fill="#4285F4"/>
    <circle cx="24" cy="24" r="9" fill="#FFFFFF"/>
    <circle cx="24" cy="24" r="7" fill="#4285F4"/>
    <circle cx="24" cy="24" r="3.5" fill="#FFFFFF"/>
    <path d="M24 2L38 24H10L24 2Z" fill="#EA4335" opacity="0.9"/>
    <path d="M24 2L38 24H10L24 2Z" fill="none"/>
    <path d="M10 24L24 46L38 24" fill="#34A853" opacity="0.9"/>
    <path d="M24 2L38 24H10L24 2Z" fill="#FBBC04" opacity="0.9" transform="rotate(120 24 24)"/>
  </svg>
);

const BraveIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="12" fill="#FB542B"/>
    <path d="M24 8L8 18V30L24 42L40 30V18L24 8Z" fill="#FFFFFF" opacity="0.15"/>
    <path d="M24 12L14 18V28L24 36L34 28V18L24 12Z" fill="#FB542B"/>
    <path d="M20 20L24 16L28 20V28L24 32L20 28V20Z" fill="#FFFFFF"/>
    <path d="M22 22L24 20L26 22V26L24 28L22 26V22Z" fill="#FB542B"/>
  </svg>
);

const FirefoxIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" fill="#FF7139"/>
    <circle cx="24" cy="24" r="16" fill="#FFD567"/>
    <circle cx="24" cy="24" r="10" fill="#FF7139"/>
    <circle cx="24" cy="24" r="5" fill="#FFFFFF"/>
    <path d="M24 2C14 2 6 8 4 18C8 12 16 8 24 8C32 8 40 12 44 18C42 8 34 2 24 2Z" fill="#FF9500"/>
  </svg>
);

const EdgeIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" fill="#0078D7"/>
    <path d="M12 28C12 18 18 10 28 10C34 10 38 14 38 20H28C28 16 24 14 20 16C16 18 14 22 14 28C14 34 18 38 24 38C30 38 34 34 36 28H40C38 36 32 42 24 42C14 42 12 34 12 28Z" fill="#FFFFFF"/>
  </svg>
);

const ChromiumIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" fill="#4285F4"/>
    <circle cx="24" cy="24" r="9" fill="#FFFFFF"/>
    <circle cx="24" cy="24" r="7" fill="#4285F4"/>
    <circle cx="24" cy="24" r="3.5" fill="#FFFFFF"/>
  </svg>
);

const iconMap: Record<BrowserType, React.FC<{ size: number }>> = {
  chrome: ChromeIcon,
  brave: BraveIcon,
  firefox: FirefoxIcon,
  edge: EdgeIcon,
  chromium: ChromiumIcon,
};

const BrowserIcon: React.FC<BrowserIconProps> = ({ browser, size = 24, sx }) => {
  const IconComponent = iconMap[browser] || ChromeIcon;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...sx }}>
      <IconComponent size={size} />
    </div>
  );
};

export default BrowserIcon;
