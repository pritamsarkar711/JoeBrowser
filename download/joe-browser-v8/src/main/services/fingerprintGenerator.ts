// ============================================================
// Joe Browser - Fingerprint Generator
// Generates realistic browser fingerprints per browser type
// ============================================================

import {
  BrowserType,
  DeviceType,
  OsType,
  FingerprintConfig,
  MOBILE_RESOLUTIONS,
} from '../../shared/types';

// ----- User-Agent Templates per browser/os -----

const UA_TEMPLATES: Record<BrowserType, Record<OsType, string>> = {
  chrome: {
    windows:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    macos:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    linux:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    android:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    ios:
      'Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  },
  brave: {
    windows:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    macos:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    linux:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    android:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    ios:
      'Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  },
  firefox: {
    windows:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    macos:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
    linux:
      'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
    android:
      'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0',
    ios:
      'Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15',
  },
  edge: {
    windows:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    macos:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    linux:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    android:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 EdgA/131.0.0.0',
    ios:
      'Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.0.0 Mobile/15E148 Safari/605.1.15',
  },
  chromium: {
    windows:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    macos:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    linux:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    android:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    ios:
      'Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  },
};

// ----- WebGL renderers per OS -----

const WEBGL_RENDERERS: Record<OsType, { vendor: string; renderer: string }[]> = {
  windows: [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)' },
  ],
  macos: [
    { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M2, Unspecified Version)' },
    { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M1, Unspecified Version)' },
    { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M3, Unspecified Version)' },
  ],
  linux: [
    { vendor: 'Mesa', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' },
    { vendor: 'Mesa', renderer: 'Mesa NVIDIA GeForce RTX 4070' },
    { vendor: 'X.Org', renderer: 'AMD Radeon RX 6800 XT (navi10, LLVM 15.0.7)' },
  ],
  android: [
    { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
    { vendor: 'Qualcomm', renderer: 'Adreno (TM) 660' },
    { vendor: 'ARM', renderer: 'Mali-G78' },
  ],
  ios: [
    { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  ],
};

// ----- Screen resolutions per OS -----

const SCREEN_RESOLUTIONS: Record<OsType, { screen: string; available: string; colorDepth: number }[]> = {
  windows: [
    { screen: '1920x1080', available: '1920x1040', colorDepth: 24 },
    { screen: '2560x1440', available: '2560x1400', colorDepth: 24 },
    { screen: '1366x768', available: '1366x728', colorDepth: 24 },
    { screen: '3840x2160', available: '3840x2120', colorDepth: 24 },
  ],
  macos: [
    { screen: '2560x1600', available: '2560x1556', colorDepth: 24 },
    { screen: '1440x900', available: '1440x856', colorDepth: 24 },
    { screen: '1680x1050', available: '1680x1006', colorDepth: 24 },
  ],
  linux: [
    { screen: '1920x1080', available: '1920x1040', colorDepth: 24 },
    { screen: '2560x1440', available: '2560x1400', colorDepth: 24 },
  ],
  android: [
    { screen: '412x915', available: '412x915', colorDepth: 24 },
    { screen: '360x780', available: '360x780', colorDepth: 24 },
  ],
  ios: [
    { screen: '393x852', available: '393x852', colorDepth: 24 },
    { screen: '390x844', available: '390x844', colorDepth: 24 },
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a fingerprint for a new profile.
 * Accepts browserType, os, and device to create realistic fingerprints.
 */
export function generateForNewProfile(
  browser: BrowserType,
  os?: OsType,
  device?: DeviceType,
): FingerprintConfig {
  const deviceType = device || 'desktop';
  const targetOs = os || 'windows';

  // For mobile device types, override OS to android/ios
  const effectiveOs: OsType =
    deviceType === 'mobile'
      ? targetOs === 'ios'
        ? 'ios'
        : 'android'
      : targetOs;

  const userAgent = UA_TEMPLATES[browser][effectiveOs];
  const webgl = pickRandom(WEBGL_RENDERERS[effectiveOs]);

  let screenRes: { screen: string; available: string; colorDepth: number };
  if (deviceType === 'mobile') {
    const mobileKey = effectiveOs === 'ios' ? 'iphone-15-pro' : 'pixel-8';
    const res = MOBILE_RESOLUTIONS[mobileKey];
    screenRes = {
      screen: `${res.width}x${res.height}`,
      available: `${res.width}x${res.height}`,
      colorDepth: 24,
    };
  } else {
    screenRes = pickRandom(SCREEN_RESOLUTIONS[effectiveOs]);
  }

  // Platform string
  const platformMap: Record<OsType, string> = {
    windows: 'Win32',
    macos: 'MacIntel',
    linux: 'Linux x86_64',
    android: 'Linux armv81',
    ios: 'iPhone',
  };

  // Vendor string
  const vendorMap: Record<BrowserType, string> = {
    chrome: 'Google Inc.',
    brave: 'Google Inc.',
    firefox: '',
    edge: 'Google Inc.',
    chromium: 'Google Inc.',
  };

  // Hardware concurrency
  const hwConcurrency = deviceType === 'mobile'
    ? randomInt(4, 8)
    : randomInt(4, 16);

  // Device memory
  const deviceMemory = deviceType === 'mobile'
    ? pickRandom([4, 6, 8])
    : pickRandom([8, 16, 32]);

  // Max touch points
  const maxTouchPoints = deviceType === 'mobile' ? 5 : 0;

  // Languages
  const languages = ['en-US', 'en'];

  // Timezones
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
  ];

  return {
    userAgent,
    platform: platformMap[effectiveOs],
    vendor: vendorMap[browser],
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    screenResolution: screenRes.screen,
    availableScreenResolution: screenRes.available,
    colorDepth: screenRes.colorDepth,
    hardwareConcurrency: hwConcurrency,
    deviceMemory,
    maxTouchPoints,
    language: 'en-US',
    languages,
    timezone: pickRandom(timezones),
    canvasNoise: Math.random() * 0.01,
    audioNoise: Math.random() * 0.001,
    webRtcPolicy: 'default',
    browserType: browser,
    deviceType,
    targetOs: effectiveOs,
  };
}

/**
 * Generate a default profile name
 */
export function generateProfileName(browser: BrowserType, index: number): string {
  const names: Record<BrowserType, string> = {
    chrome: 'Chrome',
    brave: 'Brave',
    firefox: 'Firefox',
    edge: 'Edge',
    chromium: 'Chromium',
  };
  return `${names[browser]} Profile ${index}`;
}
