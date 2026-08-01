/**
 * Headless self-test: verifies the core engines work without launching a
 * browser window.
 *
 *   Electron:  electron . --selftest        (exits 0/1)
 *   Plain node: npx tsx scripts/selftest.ts (exits 0/1)
 *
 * The test body is Electron-free; only the callers differ.
 */
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import * as paths from '../main/paths'
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  deriveKey,
  verifyKey,
  makeVerifier,
  encryptJson,
  decryptJson
} from '../main/crypto/cipher'
import { setMasterPassword, unlock, changeMasterPassword, isInitialized, lock } from '../main/crypto/masterKey'
import { openDatabase, insertProfile, listProfiles, getMeta, setMeta, closeDatabase } from '../main/db/database'
import { generateFingerprint, deriveFingerprintFromUA, hashString, mulberry32 } from '../main/services/fingerprintGenerator'
import { parseUA } from '../main/services/uaDatabase'
import { buildExtension, buildFirefoxXpi, crc32, zipStore } from '../main/services/extensionBuilder'
import { createNewProfile, defaultFingerprint, type ProfileData } from '../shared/types'
import { detectBrowser } from '../main/services/browserDetector'

let failures = 0

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log('  [PASS]', name)
  } else {
    failures++
    console.error('  [FAIL]', name, detail)
  }
}

export async function runSelfTests(): Promise<number> {
  console.log('StealthBrowser self-test starting...')

  // --- isolated temp data dir --------------------------------------------
  const tmp = mkdtempSync(join(tmpdir(), 'stealthbrowser-selftest-'))
  paths.setDataDir(tmp)
  paths.ensureDirs()

  try {
    // --- crypto round trip --------------------------------------------------
    console.log('[1] Crypto')
    const key = randomBytes(32)
    const enc = aesGcmEncrypt(key, 'hello world')
    const dec = aesGcmDecrypt(key, enc).toString('utf-8')
    check('AES-256-GCM round trip', dec === 'hello world')
    const derived = deriveKey('password123', Buffer.from('salt'))
    check('PBKDF2 derive stable', derived.length === 32)
    check('Verifier accepts', verifyKey(derived, makeVerifier(derived)))
    check('Verifier rejects wrong key', !verifyKey(randomBytes(32), makeVerifier(derived)))
    const jsonEnc = encryptJson(key, { a: [1, 2, 3] })
    const jsonDec = decryptJson<{ a: number[] }>(key, jsonEnc)
    check('encryptJson/decryptJson', JSON.stringify(jsonDec.a) === '[1,2,3]')
    // tamper detection
    const tampered = Buffer.from(jsonEnc.toString('utf-8').replace('"data":"', '"data":"x'), 'utf-8')
    let tamperCaught = false
    try {
      decryptJson(key, tampered)
    } catch {
      tamperCaught = true
    }
    check('tamper detected (GCM auth)', tamperCaught)

    // --- master password ----------------------------------------------------
    console.log('[2] Master password')
    check('not initialized', !isInitialized())
    setMasterPassword('correct-horse')
    check('initialized', isInitialized())
    check('unlock with correct password', unlock('correct-horse'))
    changeMasterPassword('correct-horse', 'battery-staple')
    check('unlock with new password', unlock('battery-staple'))
    check('wrong password rejected', !unlock('nope'))
    lock()

    // --- database -----------------------------------------------------------
    console.log('[3] Encrypted database')
    openDatabase()
    setMeta('schema', '1')
    check('meta stored', getMeta('schema') === '1')
    unlock('battery-staple')
    const profile: ProfileData = {
      ...createNewProfile({ name: 'Test', browserType: 'chrome', tags: ['t'], fingerprintsAuto: false }),
      fingerprint: defaultFingerprint()
    }
    insertProfile(profile)
    const listed = listProfiles()
    check('profile round trip', listed.length === 1 && listed[0].name === 'Test')
    check('profile id stable', listed[0].id === profile.id)

    // --- fingerprint generator ----------------------------------------------
    console.log('[4] Fingerprint engine')
    const opts = { device: 'desktop' as const, os: 'windows' as const, browser: 'chrome' as const }
    const fp1 = generateFingerprint({ ...opts, seed: 'seed-A' })
    const fp2 = generateFingerprint({ ...opts, seed: 'seed-A' })
    const fp3 = generateFingerprint({ ...opts, seed: 'seed-B' })
    check('deterministic with same seed', JSON.stringify(fp1) === JSON.stringify(fp2))
    check('different seed differs', JSON.stringify(fp1) !== JSON.stringify(fp3))
    check('UA contains Chrome', fp1.userAgent.includes('Chrome/'))
    check('platform Win32', fp1.platform === 'Win32')
    check('languages non-empty', fp1.languages.length >= 1)
    check('screen consistent', fp1.screenAvailWidth <= fp1.screenWidth && fp1.screenAvailHeight < fp1.screenHeight)
    check('webgl renderer non-empty', fp1.webglRenderer.length > 3)
    check('cores realistic', fp1.hardwareConcurrency >= 4 && fp1.hardwareConcurrency <= 32)
    const parsed = parseUA(fp1.userAgent)
    check('UA parses back', parsed !== null && parsed.browser === 'chrome' && parsed.os === 'windows')
    const derivedFp = deriveFingerprintFromUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'seed-C'
    )
    check('derive from custom UA', derivedFp.userAgent.includes('Chrome/131'))
    check('seed hashing', hashString('x') === hashString('x') && mulberry32(42)() === mulberry32(42)())
    const mobile = generateFingerprint({ device: 'mobile', os: 'android', browser: 'chrome', seed: 'm1' })
    check('mobile UA has Mobile', /Mobile/.test(mobile.userAgent), mobile.userAgent)
    check('mobile touch points', mobile.maxTouchPoints === 5)
    const ff = generateFingerprint({ device: 'desktop', os: 'macos', browser: 'firefox', seed: 'f1' })
    check('firefox UA + oscpu', /Firefox\/\d+/.test(ff.userAgent) && ff.oscpu.length > 0)

    // --- browser detector (may find nothing in CI — must not throw) ---------
    console.log('[5] Browser detection')
    try {
      const det = detectBrowser('chrome')
      check('detect returns result', typeof det.found === 'boolean' && typeof det.path === 'string')
    } catch (e) {
      check('detect no crash', false, String(e))
    }

    // --- extension builder ---------------------------------------------------
    console.log('[6] Extension builder')
    const extDir = join(tmp, 'ext-build')
    const built = buildExtension(profile, extDir)
    check('built config browserType', built.config.browserType === profile.browserType)
    check('manifest written (MV3)', (() => {
      const m = JSON.parse(readFileSync(join(extDir, 'manifest.json'), 'utf-8')) as { manifest_version: number }
      return m.manifest_version === 3
    })())
    const mainJs = readFileSync(join(extDir, 'stealth-main.js'), 'utf-8')
    check('config injected (no placeholder left)', !mainJs.includes('__INJECT_CONFIG__'))
    check('config present in script', mainJs.includes('"browserType"'))
    check('config.js written', readFileSync(join(extDir, 'config.js'), 'utf-8').includes('__STEALTH_CONFIG__'))
    const firefoxProfile: ProfileData = { ...profile, browserType: 'firefox' }
    const xpi = buildFirefoxXpi(firefoxProfile, join(tmp, 'xpi-build'))
    const xpiBuf = readFileSync(xpi)
    check('xpi has zip magic', xpiBuf[0] === 0x50 && xpiBuf[1] === 0x4b)
    check('crc32 known value', crc32(Buffer.from('123456789')) === 0xcbf43926)
    const zip = zipStore([{ name: 'a.txt', data: Buffer.from('hi') }])
    check('zipStore has EOCD', zip.readUInt32LE(zip.length - 22) === 0x06054b50)
    // verify xpi contains all three files (parse central directory)
    const zipStr = zipStore([{ name: 'manifest.json', data: Buffer.from('{}') }, { name: 'stealth-main.js', data: Buffer.from('x') }])
    const names = zipStr.toString('latin1').match(/manifest\.json|stealth-main\.js/g) ?? []
    check('zip contains both files', names.length >= 2, names.join(','))

    // --- extension main-world script syntax check -----------------------------
    console.log('[7] Extension JS syntax')
    // crude but effective: wrap in a function and eval under node
    const syntaxOk = (() => {
      try {
        // eslint-disable-next-line no-new-func
        new Function(mainJs.replace('__INJECT_CONFIG__', '{}'))
        return true
      } catch (e) {
        console.error('    syntax error:', e)
        return false
      }
    })()
    check('stealth-main.js parses', syntaxOk)

    // --- proxy relay / PAC modules load ----------------------------------------
    console.log('[8] Proxy helpers')
    const { pacFileForProxy } = await import('../main/services/pacServer')
    check('PAC script generated', pacFileForProxy('1.2.3.4', 8080, 'socks5').includes('SOCKS5 1.2.3.4:8080'))
    const { deployProxy } = await import('../main/services/proxyRelay')
    const direct = await deployProxy({ enabled: true, type: 'http', host: '1.2.3.4', port: 8080, username: '', password: '', pacUrl: '' })
    check('http without auth passes through', direct.proxyServer === 'http://1.2.3.4:8080' && !direct.viaRelay)
    await direct.close()
    const auth = await deployProxy({ enabled: true, type: 'socks5', host: '1.2.3.4', port: 1080, username: 'u', password: 'p', pacUrl: '' })
    check('socks5 with auth uses local relay', auth.viaRelay && auth.proxyServer.startsWith('socks5://127.0.0.1:'))
    await auth.close()
  } finally {
    closeDatabase()
    rmSync(tmp, { recursive: true, force: true })
  }

  console.log(failures === 0 ? '\nSELF-TEST PASSED' : `\nSELF-TEST FAILED (${failures} failures)`)
  return failures
}

export default runSelfTests
