// ============================================================
// Joe Browser - Fingerprint Generator
// Generates consistent, realistic fingerprints for each browser type
// Updated: Chrome 131, Firefox 133, Edge 131, Brave 131
// ============================================================

import { BrowserType, DeviceType, OsType, FingerprintConfig } from '../../shared/types';

// ===== REALISTIC USER AGENT TEMPLATES =====
// Updated to latest browser versions as of 2024

interface UAInfo {
  platform: string;
  osInfo: string;
  ua: string;
  vendor: string;
  webglVendor: string;
  webglRenderer: string;
}

function getUAInfo(browserType: BrowserType, os: OsType, deviceType: DeviceType): UAInfo {
  // Latest browser versions
  const chromeVersion = '131.0.6778.139';
  const firefoxVersion = '133.0';
  const edgeVersion = '131.0.2903.86';

  // OS-specific platform string and UA OS info
  let platform: string;
  let osInfo: string;

  if (deviceType === 'mobile') {
    switch (os) {
      case 'android':
        platform = 'Linux armv81';
        osInfo = 'Linux; Android 14; Pixel 8';
        break;
      case 'ios':
        platform = 'iPhone';
        osInfo = 'iPhone; CPU iPhone OS 18_1 like Mac OS X';
        break;
      default:
        platform = 'Linux armv81';
        osInfo = 'Linux; Android 14; Pixel 8';
    }
  } else {
    switch (os) {
      case 'windows':
        platform = 'Win32';
        osInfo = 'Windows NT 10.0; Win64; x64';
        break;
      case 'macos':
        platform = 'MacIntel';
        osInfo = 'Macintosh; Intel Mac OS X 10_15_7';
        break;
      case 'linux':
        platform = 'Linux x86_64';
        osInfo = 'X11; Linux x86_64';
        break;
      default:
        platform = 'Win32';
        osInfo = 'Windows NT 10.0; Win64; x64';
    }
  }

  // Build UA string based on browser type
  let ua: string;
  let vendor: string;
  let webglVendor: string;
  let webglRenderer: string;

  // WebGL vendor/renderer options (realistic hardware)
  const webglOptions = [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  ];
  const webglIdx = Math.floor(Math.random() * webglOptions.length);
  const firefoxWebglOptions = [
    { vendor: 'NVIDIA Corporation', renderer: 'GeForce RTX 3060/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'GeForce GTX 1660 SUPER/PCIe/SSE2' },
    { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' },
    { vendor: 'X.Org', renderer: 'AMD Radeon RX 580 Series (polaris10, LLVM 15.0.7, DRM 3.49, 6.1.0)' },
  ];
  const firefoxWebglIdx = Math.floor(Math.random() * firefoxWebglOptions.length);

  switch (browserType) {
    case 'chrome':
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else if (deviceType === 'mobile' && os === 'ios') {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${chromeVersion} Mobile/15E148 Safari/604.1`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = 'Google Inc.';
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;

    case 'brave':
      // Brave uses the same UA as Chrome but with chrome.brave object
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = 'Google Inc.';
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;

    case 'firefox':
      // Firefox has a completely different UA format
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Android 14; Mobile; rv:${firefoxVersion}) Gecko/${firefoxVersion} Firefox/${firefoxVersion}`;
      } else if (deviceType === 'mobile' && os === 'ios') {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${firefoxVersion} Mobile/15E148 Safari/605.1.15`;
      } else {
        switch (os) {
          case 'windows':
            ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
            break;
          case 'macos':
            ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
            break;
          case 'linux':
            ua = `Mozilla/5.0 (X11; Linux x86_64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
            break;
          default:
            ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
        }
      }
      // CRITICAL: Firefox has empty vendor string
      vendor = '';
      // Firefox uses different WebGL vendor/renderer (no ANGLE prefix)
      webglVendor = firefoxWebglOptions[firefoxWebglIdx].vendor;
      webglRenderer = firefoxWebglOptions[firefoxWebglIdx].renderer;
      break;

    case 'edge':
      // Edge UA is same as Chrome but with "Edg/" suffix
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36 EdgA/${edgeVersion}`;
      } else if (deviceType === 'mobile' && os === 'ios') {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/${edgeVersion} Mobile/15E148 Safari/605.1.15`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
      }
      vendor = 'Google Inc.';
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;

    case 'chromium':
      // Chromium uses the same UA as Chrome
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = 'Google Inc.';
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;

    default:
      ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      vendor = 'Google Inc.';
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
  }

  return { platform, osInfo, ua, vendor, webglVendor, webglRenderer };
}

/**
 * Generate a fingerprint for a profile
 * All values are consistent with each other (e.g., UA matches platform, OS matches vendor)
 */
export function generateFingerprint(
  browserType: BrowserType,
  deviceType: DeviceType,
  os: OsType
): FingerprintConfig {
  const uaInfo = getUAInfo(browserType, os, deviceType);

  // Screen resolution based on device type
  let screenResolution: string;
  let availableScreenResolution: string;
  let maxTouchPoints: number;

  if (deviceType === 'mobile') {
    if (os === 'ios') {
      screenResolution = '1170x2532';
      availableScreenResolution = '1170x2422';
    } else {
      screenResolution = '1080x2400';
      availableScreenResolution = '1080x2290';
    }
    maxTouchPoints = 5;
  } else {
    switch (os) {
      case 'macos':
        screenResolution = '2560x1440';
        availableScreenResolution = '2560x1325';
        break;
      case 'linux':
        screenResolution = '1920x1080';
        availableScreenResolution = '1920x971';
        break;
      default: // windows
        screenResolution = '1920x1080';
        availableScreenResolution = '1920x1040';
    }
    maxTouchPoints = 0;
  }

  // Hardware concurrency based on device type
  const hardwareConcurrency = deviceType === 'mobile' ? 8 : [4, 8, 12, 16][Math.floor(Math.random() * 4)];

  // Device memory based on device type
  const deviceMemory = deviceType === 'mobile' ? 8 : [4, 8, 16][Math.floor(Math.random() * 3)];

  // Language and timezone
  const language = 'en-US';
  const languages = ['en-US', 'en'];

  // Timezone based on OS
  const timezone = 'America/New_York';

  // Canvas noise — small random value for uniqueness
  const canvasNoise = Math.floor(Math.random() * 5) + 1;

  // Audio noise — small random value
  const audioNoise = Math.floor(Math.random() * 3) + 1;

  // WebRTC policy
  const webRtcPolicy = 'default';

  return {
    userAgent: uaInfo.ua,
    platform: uaInfo.platform,
    vendor: uaInfo.vendor,
    webglVendor: uaInfo.webglVendor,
    webglRenderer: uaInfo.webglRenderer,
    screenResolution,
    availableScreenResolution,
    colorDepth: 24,
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints,
    language,
    languages,
    timezone,
    canvasNoise,
    audioNoise,
    webRtcPolicy,
    browserType,
    deviceType,
    targetOs: os,
  };
}
