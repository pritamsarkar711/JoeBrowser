/**
 * Stealth extension builder.
 *
 * The extension is built LOCALLY for each profile launch:
 *  1. read the template extension files from src/extension (packaged under
 *     resources/extension),
 *  2. serialize the profile's fingerprint into a config object,
 *  3. write a unique temporary extension directory with the config injected
 *     into stealth-main.js (and config.js),
 *  4. for Firefox, additionally package the files into an unsigned .xpi
 *     (plain "stored" ZIP — no compression, no external zip dependency).
 *
 * Every launch gets its own temp dir, so concurrent profiles can never share
 * or clash over extension state.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import type { ProfileData } from '@shared/types'
import { extensionTemplateDir } from '../paths'
import { parseUA } from './uaDatabase'
import { getFontsForOS } from './fingerprintGenerator'
import { logger } from '../logger'

const PLACEHOLDER = '__INJECT_CONFIG__'
export const FIREFOX_EXT_ID = 'stealth-engine@stealthbrowser.local'

export interface BuiltExtension {
  dir: string
  config: ExtensionConfig
}

export interface ExtensionConfig {
  version: string
  browserType: string
  userAgent: string
  platform: string
  oscpu: string
  language: string
  languages: string[]
  timezone: string
  timezoneOffset: number
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
    dpr: number
  }
  hardwareConcurrency: number
  deviceMemory: number
  maxTouchPoints: number
  webglVendor: string
  webglRenderer: string
  canvasNoiseEnabled: boolean
  canvasNoiseSeed: number
  audioNoiseEnabled: boolean
  audioNoiseSeed: number
  webRTCLeakProtect: boolean
  fontFingerprintProtection: boolean
  fonts: string[]
  pluginsSpoof: boolean
  geolocation: { mode: 'block' | 'spoof'; latitude: number; longitude: number }
}

export function buildExtensionConfig(profile: ProfileData): ExtensionConfig {
  const fp = profile.fingerprint
  const parsed = parseUA(fp.userAgent)
  const fonts =
    fp.customFonts && fp.customFonts.length
      ? fp.customFonts
      : getFontsForOS(parsed?.os ?? 'windows')

  return {
    version: '1.0.0',
    browserType: profile.browserType,
    userAgent: fp.userAgent,
    platform: fp.platform,
    oscpu: fp.oscpu,
    language: fp.language,
    languages: fp.languages,
    timezone: fp.timezone,
    timezoneOffset: fp.timezoneOffset,
    screen: {
      width: fp.screenWidth,
      height: fp.screenHeight,
      availWidth: fp.screenAvailWidth,
      availHeight: fp.screenAvailHeight,
      colorDepth: fp.screenColorDepth,
      pixelDepth: fp.screenPixelDepth,
      dpr: fp.devicePixelRatio
    },
    hardwareConcurrency: fp.hardwareConcurrency,
    deviceMemory: fp.deviceMemory,
    maxTouchPoints: fp.maxTouchPoints,
    webglVendor: fp.webglVendor,
    webglRenderer: fp.webglRenderer,
    canvasNoiseEnabled: fp.canvasNoiseEnabled,
    canvasNoiseSeed: fp.canvasNoiseSeed,
    audioNoiseEnabled: fp.audioNoiseEnabled,
    audioNoiseSeed: fp.audioNoiseSeed,
    webRTCLeakProtect: fp.webRTCLeakProtect,
    fontFingerprintProtection: fp.fontFingerprintProtection,
    fonts,
    pluginsSpoof: fp.pluginsSpoof,
    geolocation: {
      mode: fp.geolocation.mode,
      latitude: fp.geolocation.latitude,
      longitude: fp.geolocation.longitude
    }
  }
}

function injectConfig(jsTemplate: string, config: ExtensionConfig): string {
  const json = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return jsTemplate.split(PLACEHOLDER).join(json)
}

/** Write a built extension directory for the given profile. */
export function buildExtension(profile: ProfileData, destDir: string): BuiltExtension {
  const template = extensionTemplateDir()
  if (!existsSync(template)) {
    throw new Error('Extension template not found at ' + template)
  }
  rmSync(destDir, { recursive: true, force: true })
  mkdirSync(destDir, { recursive: true })

  const config = buildExtensionConfig(profile)
  const isFirefox = profile.browserType === 'firefox'

  copyFileSync(join(template, 'background.js'), join(destDir, 'background.js'))
  copyFileSync(
    join(template, isFirefox ? 'manifest.firefox.json' : 'manifest.chrome.json'),
    join(destDir, 'manifest.json')
  )

  const mainTemplate = readFileSync(join(template, 'stealth-main.js'), 'utf-8')
  writeFileSync(join(destDir, 'stealth-main.js'), injectConfig(mainTemplate, config), 'utf-8')

  // config.js mirrors the injected values (useful for debugging the build).
  const configTemplate = readFileSync(join(template, 'config.template.js'), 'utf-8')
  writeFileSync(join(destDir, 'config.js'), injectConfig(configTemplate, config), 'utf-8')

  logger.debug('Built stealth extension at', destDir)
  return { dir: destDir, config }
}

// ---------------------------------------------------------------------------
// Minimal ZIP writer (store method) for the Firefox .xpi
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(d = new Date()): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  }
}

/** Create a ZIP archive (entries stored, no compression). */
export function zipStore(files: Array<{ name: string; data: Buffer }>): Buffer {
  const { time, date } = dosDateTime()
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf-8')
    const crc = crc32(file.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(0, 8) // method: store
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(file.data.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28) // extra len
    chunks.push(local, nameBuf, file.data)

    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4) // version made by
    cen.writeUInt16LE(20, 6) // version needed
    cen.writeUInt16LE(0, 8)
    cen.writeUInt16LE(0, 10)
    cen.writeUInt16LE(time, 12)
    cen.writeUInt16LE(date, 14)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(file.data.length, 20)
    cen.writeUInt32LE(file.data.length, 24)
    cen.writeUInt16LE(nameBuf.length, 28)
    cen.writeUInt32LE(offset, 42)
    central.push(Buffer.concat([cen, nameBuf]))
    offset += local.length + nameBuf.length + file.data.length
  }

  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...chunks, centralBuf, end])
}

/** Build a Firefox .xpi (unsigned, sideloaded into the profile). */
export function buildFirefoxXpi(profile: ProfileData, outDir: string): string {
  const staging = buildExtension(profile, join(outDir, 'staging'))
  const files = [
    { name: 'manifest.json', data: readFileSync(join(staging.dir, 'manifest.json')) },
    { name: 'background.js', data: readFileSync(join(staging.dir, 'background.js')) },
    { name: 'stealth-main.js', data: readFileSync(join(staging.dir, 'stealth-main.js')) }
  ]
  const xpi = zipStore(files)
  const xpiPath = join(outDir, FIREFOX_EXT_ID + '.xpi')
  writeFileSync(xpiPath, xpi)
  rmSync(staging.dir, { recursive: true, force: true })
  logger.debug('Built Firefox XPI at', xpiPath)
  return xpiPath
}
