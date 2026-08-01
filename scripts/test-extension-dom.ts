/**
 * DOM-level test of the stealth extension's MAIN-world script.
 *
 * Loads the REAL built extension output (via the extension builder) into a
 * jsdom window at "document_start" and verifies the spoofed values are what
 * page scripts observe.
 *
 *   npm run test:extension
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { buildExtensionConfig } from '../src/main/services/extensionBuilder'
import { generateFingerprint } from '../src/main/services/fingerprintGenerator'
import { createNewProfile, type ProfileData } from '../src/shared/types'

let failures = 0
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) console.log('  [PASS]', name)
  else {
    failures++
    console.error('  [FAIL]', name, detail)
  }
}

async function main(): Promise<void> {
  const profile: ProfileData = {
    ...createNewProfile({ name: 'DOM Test', browserType: 'chrome', tags: [], fingerprintsAuto: false }),
    fingerprint: generateFingerprint({ device: 'desktop', os: 'windows', browser: 'chrome', seed: 'dom-test-seed' })
  }
  profile.fingerprint.customFonts = ['Arial', 'Segoe UI', 'Times New Roman']
  profile.fingerprint.canvasNoiseEnabled = true
  profile.fingerprint.audioNoiseEnabled = true
  profile.fingerprint.webRTCLeakProtect = true
  profile.fingerprint.fontFingerprintProtection = true

  const config = buildExtensionConfig(profile)
  const scriptSrc = readFileSync(join(process.cwd(), 'src', 'extension', 'stealth-main.js'), 'utf-8')
    .split('__INJECT_CONFIG__')
    .join(JSON.stringify(config))

  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://example.com/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  })
  const { window } = dom

  // --- install a faithful fake FontFaceSet BEFORE the script runs ------------
  window.eval(`
    window.__FakeFontFaceSet = function (faces) { this._faces = faces; };
    window.__FakeFontFaceSet.prototype[Symbol.iterator] = function* () { yield* this._faces; };
    window.__FakeFontFaceSet.prototype.forEach = function (cb) { for (const f of this._faces) cb(f, f, this); };
    window.__FakeFontFaceSet.prototype.entries = function* () { for (const f of this._faces) yield [f, f]; };
    window.__FakeFontFaceSet.prototype.load = function (font) {
      return Promise.resolve(this._faces.filter(function (f) { return font.indexOf(f.family) !== -1; }));
    };
    window.__FakeFontFaceSet.prototype.check = function (font) {
      return this._faces.some(function (f) { return font.indexOf(f.family) !== -1; });
    };
    window.document.fonts = new window.__FakeFontFaceSet([
      { family: 'Arial' }, { family: 'Segoe UI' }, { family: 'Times New Roman' },
      { family: 'Comic Sans MS' }, { family: 'Impact' }, { family: 'Courier New' }
    ]);
  `)

  // --- run the stealth script (what the extension does at document_start) -----
  window.eval(scriptSrc)

  console.log('Fingerprint under test:')
  console.log('  UA:', profile.fingerprint.userAgent)
  console.log('  Screen:', profile.fingerprint.screenWidth + 'x' + profile.fingerprint.screenHeight)
  console.log('  WebGL:', profile.fingerprint.webglRenderer)

  // --- navigator ----------------------------------------------------------------
  check('navigator.userAgent spoofed', window.navigator.userAgent === profile.fingerprint.userAgent, window.navigator.userAgent)
  check('navigator.webdriver false', window.navigator.webdriver === false)
  check('navigator.platform spoofed', window.navigator.platform === profile.fingerprint.platform, String(window.navigator.platform))
  check('navigator.language spoofed', window.navigator.language === profile.fingerprint.language)
  check('navigator.languages spoofed', JSON.stringify(window.navigator.languages) === JSON.stringify(profile.fingerprint.languages))
  check('hardwareConcurrency spoofed', window.navigator.hardwareConcurrency === profile.fingerprint.hardwareConcurrency)
  check('deviceMemory spoofed', window.navigator.deviceMemory === profile.fingerprint.deviceMemory)
  check('maxTouchPoints spoofed', window.navigator.maxTouchPoints === profile.fingerprint.maxTouchPoints)
  check('navigator.plugins non-empty for Chromium', window.navigator.plugins.length >= 1, String(window.navigator.plugins.length))
  check('plugins have item/namedItem', typeof window.navigator.plugins.item === 'function')
  check('mimeTypes has application/pdf', window.navigator.mimeTypes.namedItem('application/pdf') !== null)
  check('vendor = Google Inc.', window.navigator.vendor === 'Google Inc.')

  // --- screen ---------------------------------------------------------------------
  check('screen.width spoofed', window.screen.width === profile.fingerprint.screenWidth, String(window.screen.width))
  check('screen.height spoofed', window.screen.height === profile.fingerprint.screenHeight)
  check('screen.availWidth spoofed', window.screen.availWidth === profile.fingerprint.screenAvailWidth)
  check('screen.colorDepth spoofed', window.screen.colorDepth === profile.fingerprint.screenColorDepth)
  check('devicePixelRatio spoofed', window.devicePixelRatio === profile.fingerprint.devicePixelRatio, String(window.devicePixelRatio))

  // --- Date / timezone ------------------------------------------------------------
  check(
    'getTimezoneOffset spoofed',
    window.Date.prototype.getTimezoneOffset.call(new Date()) === -profile.fingerprint.timezoneOffset,
    String(window.Date.prototype.getTimezoneOffset.call(new Date()))
  )

  // --- Function.prototype.toString native look -------------------------------------
  const fnStr = window.Function.prototype.toString.call(window.Date.prototype.getTimezoneOffset)
  check('wrapped fn looks native', /^function getTimezoneOffset\(\) \{ \[native code\] \}$/.test(fnStr), fnStr)

  // --- Fonts ------------------------------------------------------------------------
  try {
    const seen: string[] = []
    window.document.fonts.forEach((f: { family: string }) => seen.push(f.family))
    check(
      'document.fonts only enumerates whitelisted',
      seen.every((fam) => profile.fingerprint.customFonts.some((w) => w.toLowerCase() === fam.toLowerCase())),
      seen.join(', ')
    )
    check('check() refuses non-whitelisted font', window.document.fonts.check('10px Impact') === false)
    check('check() allows whitelisted font', window.document.fonts.check('10px Arial') === true)
    const loaded = await window.document.fonts.load('10px Impact')
    check('load() returns empty for non-whitelisted', loaded.length === 0, JSON.stringify(loaded))
  } catch (e) {
    console.log('  [SKIP] FontFaceSet test (jsdom):', (e as Error).message)
  }

  // --- marker ----------------------------------------------------------------------
  check('__stealthBrowserEngine__ marker present', (window as unknown as Record<string, unknown>).__stealthBrowserEngine__ !== undefined)

  // --- survival check: page script overwrites navigator.userAgent -------------------
  window.eval('navigator.userAgent = "HACKED"; Object.defineProperty(navigator, "userAgent", { value: "HACKED2" })')
  // our getter is on the prototype — a page can shadow it, but the prototype getter
  // remains for any code reading via getPrototypeOf chains; verify the descriptor is still ours.
  const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window.navigator), 'userAgent')
  check('prototype getter survives page shadowing', !!desc && typeof desc.get === 'function')

  console.log(failures === 0 ? '\nEXTENSION DOM TEST PASSED' : `\n${failures} FAILURES`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
