// ============================================================
// JoeBrowser Stealth - Firefox Inject Script
// Runs in MAIN world of the page — can override page JS objects
// Same logic as Chrome content.js but loaded via <script> tag
// ============================================================
(function() {
  'use strict';

  const fp = window.__JOE_FINGERPRINT__;
  if (!fp) return;
  if (window.__joeStealthApplied) return;
  window.__joeStealthApplied = true;

  // ===== NAVIGATOR OVERRIDES =====
  try {
    Object.defineProperty(navigator, 'userAgent', { get: () => fp.userAgent });
    Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
    Object.defineProperty(navigator, 'vendor', { get: () => fp.vendor || '' });
    Object.defineProperty(navigator, 'language', { get: () => fp.language });
    Object.defineProperty(navigator, 'languages', { get: () => fp.languages });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => fp.maxTouchPoints });
    Object.defineProperty(navigator, 'cookieEnabled', { get: () => true });
    Object.defineProperty(navigator, 'doNotTrack', { get: () => null });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  } catch(e) {}

  // ===== SCREEN OVERRIDES =====
  try {
    const screenRes = fp.screenResolution.split('x');
    const availRes = fp.availableScreenResolution.split('x');
    Object.defineProperty(screen, 'width', { get: () => parseInt(screenRes[0]) });
    Object.defineProperty(screen, 'height', { get: () => parseInt(screenRes[1]) });
    Object.defineProperty(screen, 'availWidth', { get: () => parseInt(availRes[0]) });
    Object.defineProperty(screen, 'availHeight', { get: () => parseInt(availRes[1]) });
    Object.defineProperty(screen, 'colorDepth', { get: () => fp.colorDepth });
    Object.defineProperty(screen, 'pixelDepth', { get: () => fp.colorDepth });
  } catch(e) {}

  // ===== TIMEZONE OVERRIDE =====
  try {
    const origDateTimeFormat = Intl.DateTimeFormat;
    const targetTimezone = fp.timezone;
    Intl.DateTimeFormat = function(...args) {
      if (args.length === 0 || !args[1]) {
        args[1] = { timeZone: targetTimezone };
      } else if (!args[1].timeZone) {
        args[1].timeZone = targetTimezone;
      }
      return new origDateTimeFormat(...args);
    };
    Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = origDateTimeFormat.supportedLocalesOf;
  } catch(e) {}

  // ===== WEBGL OVERRIDES =====
  try {
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 0x9245) return fp.webglVendor;
      if (param === 0x9246) return fp.webglRenderer;
      return origGetParam.call(this, param);
    };
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        if (param === 0x9245) return fp.webglVendor;
        if (param === 0x9246) return fp.webglRenderer;
        return origGetParam2.call(this, param);
      };
    }
  } catch(e) {}

  // ===== CANVAS NOISE =====
  try {
    const canvasNoise = fp.canvasNoise || 1;
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      try {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          const imgData = ctx.getImageData(0, 0, this.width, this.height);
          const noisy = new Uint8ClampedArray(imgData.data);
          for (let i = 0; i < noisy.length; i += 4) {
            noisy[i] = Math.max(0, Math.min(255, noisy[i] + (Math.random() - 0.5) * canvasNoise));
            noisy[i+1] = Math.max(0, Math.min(255, noisy[i+1] + (Math.random() - 0.5) * canvasNoise));
            noisy[i+2] = Math.max(0, Math.min(255, noisy[i+2] + (Math.random() - 0.5) * canvasNoise));
          }
          ctx.putImageData(new ImageData(noisy, this.width, this.height), 0, 0);
        }
      } catch(e) {}
      return origToDataURL.apply(this, args);
    };
  } catch(e) {}

  // ===== AUDIO NOISE =====
  try {
    const audioNoise = fp.audioNoise || 1;
    if (audioNoise > 0 && typeof AudioContext !== 'undefined') {
      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(channel) {
        const data = origGetChannelData.call(this, channel);
        for (let i = 0; i < data.length; i += 100) {
          data[i] += (Math.random() - 0.5) * audioNoise * 0.0001;
        }
        return data;
      };
    }
  } catch(e) {}

  // ===== FIREFOX-SPECIFIC =====
  try {
    Object.defineProperty(navigator, 'vendor', { get: () => '' });
    if (window.chrome) { try { delete window.chrome; } catch(e) {} }
  } catch(e) {}

  // ===== WEBRTC POLICY =====
  if (fp.webRtcPolicy === 'disable') {
    try {
      if (window.RTCPeerConnection) delete window.RTCPeerConnection;
      if (window.webkitRTCPeerConnection) delete window.webkitRTCPeerConnection;
    } catch(e) {}
  }

  // ===== ANTI-AUTOMATION =====
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  } catch(e) {}

  console.log('[JoeBrowser] Stealth fingerprint applied for Firefox');
})();
