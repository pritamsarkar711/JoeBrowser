/**
 * CLI: build the stealth extension for a demo profile into dist/extension-demo
 * so the output can be inspected without launching a browser.
 *
 *   npm run build:extension
 */
import { mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildExtension, buildFirefoxXpi } from '../src/main/services/extensionBuilder'
import { createNewProfile, defaultFingerprint } from '../src/shared/types'

async function main(): Promise<void> {
  const outDir = resolve(process.cwd(), 'dist', 'extension-demo')
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const chromeProfile = {
    ...createNewProfile({ name: 'Demo (Chrome)', browserType: 'chrome', tags: [], fingerprintsAuto: false }),
    fingerprint: defaultFingerprint('demo-chrome-seed')
  }
  const chromeExt = buildExtension(chromeProfile, join(outDir, 'chrome'))
  console.log('Chrome extension built at', chromeExt.dir)
  console.log('  config:', JSON.stringify(chromeExt.config, null, 2).slice(0, 400) + '…')

  const firefoxProfile = {
    ...createNewProfile({ name: 'Demo (Firefox)', browserType: 'firefox', tags: [], fingerprintsAuto: false }),
    fingerprint: defaultFingerprint('demo-firefox-seed')
  }
  const xpi = buildFirefoxXpi(firefoxProfile, join(outDir, 'firefox'))
  console.log('Firefox XPI built at', xpi)
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
