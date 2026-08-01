/**
 * Quick CLI tests for the pure-Nod modules (no Electron needed).
 *   npm run test:generator
 */
import { generateFingerprint, deriveFingerprintFromUA, createRng, hashString } from '../src/main/services/fingerprintGenerator'
import { parseUA, pickUA, UA_LIBRARY } from '../src/main/services/uaDatabase'
import { crc32, zipStore } from '../src/main/services/extensionBuilder'

let failures = 0
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) console.log('  [PASS]', name)
  else {
    failures++
    console.error('  [FAIL]', name, detail)
  }
}

console.log('UA library:')
check('library non-empty', UA_LIBRARY.length > 30, String(UA_LIBRARY.length))
for (const browser of ['chrome', 'edge', 'brave', 'firefox'] as const) {
  check(`has ${browser} entries`, UA_LIBRARY.some((e) => e.browser === browser))
}

console.log('\nGenerator:')
const fpA = generateFingerprint({ device: 'desktop', os: 'windows', browser: 'chrome', seed: 's1' })
const fpB = generateFingerprint({ device: 'desktop', os: 'windows', browser: 'chrome', seed: 's1' })
const fpC = generateFingerprint({ device: 'desktop', os: 'windows', browser: 'chrome', seed: 's2' })
check('same seed → identical', JSON.stringify(fpA) === JSON.stringify(fpB))
check('different seed → differs', JSON.stringify(fpA) !== JSON.stringify(fpC))
check('UA is real Chrome format', /^Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\) AppleWebKit\/537\.36 .*Chrome\/\d+\.\d+\.\d+\.\d+ Safari\/537\.36$/.test(fpA.userAgent), fpA.userAgent)
check('screen sane', fpA.screenWidth >= 800 && fpA.screenAvailHeight < fpA.screenHeight)
check('timezone offset valid', fpA.timezoneOffset >= -840 && fpA.timezoneOffset <= 840, String(fpA.timezoneOffset))
check('webgl set', !!fpA.webglVendor && !!fpA.webglRenderer)

const mobile = generateFingerprint({ device: 'mobile', os: 'android', browser: 'chrome', seed: 'm1' })
check('mobile UA has Mobile', /Mobile/.test(mobile.userAgent), mobile.userAgent)
check('mobile touch points', mobile.maxTouchPoints === 5, String(mobile.maxTouchPoints))
check('mobile dpr', mobile.devicePixelRatio >= 2)

const ff = generateFingerprint({ device: 'desktop', os: 'macos', browser: 'firefox', seed: 'f1' })
check('firefox UA + oscpu', /Firefox\/\d+/.test(ff.userAgent) && ff.oscpu.length > 0, ff.ua?.toString())

const derived = deriveFingerprintFromUA(
  'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'seed-d'
)
check('derive keeps UA', derived.userAgent.includes('Firefox/133.0'))
check('derive platform', derived.platform === 'Linux x86_64', derived.platform)

const rng = createRng('abc')
check('rng deterministic', rng.next() === createRng('abc').next())
check('rng int range', rng.int(1, 2) >= 1 && rng.int(1, 2) <= 2)
check('hashString', hashString('stealth') === hashString('stealth'))

console.log('\nUA parsing:')
const p1 = parseUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
check('parse chrome', p1?.browser === 'chrome' && p1?.os === 'windows' && p1?.engine === 'chromium')
const p2 = parseUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0')
check('parse firefox', p2?.browser === 'firefox' && p2?.os === 'macos')
const p3 = parseUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70')
check('parse edge', p3?.browser === 'edge')

console.log('\nZIP/CRC:')
check('crc32 known', crc32(Buffer.from('123456789')) === 0xcbf43926)
const z = zipStore([{ name: 'a.txt', data: Buffer.from('hello') }])
check('zip EOCD magic', z.readUInt32LE(z.length - 22) === 0x06054b50)

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
