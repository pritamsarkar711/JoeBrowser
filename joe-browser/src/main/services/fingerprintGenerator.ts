// ============================================================
// Joe Browser - Fingerprint Generator
// Generates consistent, realistic fingerprints for each browser type
// Fixed: Brave/Firefox/Edge UA strings, consistent platform/vendor/WebGL
// ============================================================

import { BrowserType, DeviceType, OsType, FingerprintConfig } from '../../shared/types';

// ===== REALISTIC USER AGENT TEMPLATES =====
// Each browser type has its own UA format
// Chrome:  Mozilla/5.0 ({os_info}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36
// Brave:   Mozilla/5.0 ({os_info}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36
// Edge:    Mozilla/5.0 ({os_info}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36 Edg/{version}
// Firefox: Mozilla/5.0 ({os_info}) Gecko/20100101 Firefox/{version}
// Chromium: Mozilla/5.0 ({os_info}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36

interface UAInfo {
  platform: string;
  osInfo: string;
  ua: string;
  vendor: string;
  webglVendor: string;
  webglRenderer: string;
}

function getUAInfo(browserType: BrowserType, os: OsType, deviceType: DeviceType): UAInfo {
  // Chrome versions (realistic recent versions)
  const chromeVersion = '120.0.6099.130';
  const firefoxVersion = '121.0';
  const edgeVersion = '120.0.2210.91';

  // OS-specific platform string and UA OS info
  let platform: string;
  let osInfo: string;

  if (deviceType === 'mobile') {
    switch (os) {
      case 'android':
        platform = 'Linux armv81';
        osInfo = 'Linux; Android 13; Pixel 7';
        break;
      case 'ios':
        platform = 'iPhone';
        osInfo = 'iPhone; CPU iPhone OS 17_2 like Mac OS X';
        break;
      default:
        platform = 'Linux armv81';
        osInfo = 'Linux; Android 13; Pixel 7';
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

  switch (browserType) {
    case 'chrome':
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else if (deviceType === 'mobile' && os === 'ios') {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${chromeVersion} Mobile/15E148 Safari/604.1`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = 'Google Inc.';
      webglVendor = 'Google Inc. (NVIDIA)';
      webglRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)';
      break;

    case 'brave':
      // Brave uses the same UA as Chrome but Brave is detectable via chrome.brave
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = 'Google Inc.';
      webglVendor = 'Google Inc. (NVIDIA)';
      webglRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)';
      break;

    case 'firefox':
      // Firefox has a completely different UA format
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Android 13; Mobile; rv:${firefoxVersion}) Gecko/${firefoxVersion} Firefox/${firefoxVersion}`;
      } else if (deviceType === 'mobile' && os === 'ios') {
        // Firefox on iOS uses WebKit, not Gecko
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${firefoxVersion} Mobile/15E148 Safari/605.1.15`;
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
      // Firefox uses different WebGL vendor/renderer
      webglVendor = 'NVIDIA Corporation';
      webglRenderer = 'GeForce GTX 1060 6GB/PCIe/SSE2';
      break;

    case 'edge':
      // Edge UA is same as Chrome but with "Edg/" suffix
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36 EdgA/${edgeVersion}`;
      } else if (deviceType === 'mobile' && os === 'ios') {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/${edgeVersion} Mobile/15E148 Safari/605.1.15`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
      }
      vendor = 'Google Inc.';
      webglVendor = 'Google Inc. (NVIDIA)';
      webglRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)';
      break;

    case 'chromium':
      // Chromium uses the same UA as Chrome
      if (deviceType === 'mobile' && os === 'android') {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = 'Google Inc.';
      webglVendor = 'Google Inc. (NVIDIA)';
      webglRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)';
      break;

    default:
      ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      vendor = 'Google Inc.';
      webglVendor = 'Google Inc. (NVIDIA)';
      webglRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)';
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
  const hardwareConcurrency = deviceType === 'mobile' ? 8 : 12;

  // Device memory based on device type
  const deviceMemory = deviceType === 'mobile' ? 8 : 16;

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
