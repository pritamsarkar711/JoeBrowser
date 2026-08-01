/**
 * Firefox profile provisioning.
 *
 * Firefox is launched with `-profile <dir> -no-remote`. Before the first
 * launch we write:
 *
 *  - user.js          — preferences applied at every startup (proxy,
 *                       telemetry off, UA/platform/oscpu overrides,
 *                       extension scopes, webdriver off, …)
 *  - extensions/      — the built stealth .xpi is dropped here with the
 *                       exact add-on ID as its file name, which makes
 *                       Firefox sideload it (unsigned, enabled) on startup.
 *
 * Note on UA spoofing in Firefox: navigator.userAgent is a
 * [LegacyUnforgeable] attribute, so the JS override in stealth-main.js may
 * be rejected — the prefs below are the authoritative mechanism there.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FingerprintConfig, ProfileData } from '@shared/types'
import { logger } from '../logger'
import { FIREFOX_EXT_ID, buildFirefoxXpi } from './extensionBuilder'
import type { ProxyDeployment } from './proxyRelay'

export interface FirefoxPrefsOptions {
  proxy?: ProxyDeployment | null
  pacUrl?: string
  acceptLanguage?: string
  fingerprint: FingerprintConfig
}

export function writeFirefoxUserJs(profileDir: string, opts: FirefoxPrefsOptions): void {
  const fp = profileDir
  mkdirSync(fp, { recursive: true })
  mkdirSync(join(fp, 'extensions'), { recursive: true })

  const prefs: string[] = []
  const push = (name: string, value: string): void => {
    prefs.push(`user_pref("${name}", ${value});`)
  }
  const fingerprint = opts.fingerprint

  // --- proxy ---------------------------------------------------------------
  if (opts.pacUrl) {
    push('network.proxy.type', '2')
    push('network.proxy.autoconfig_url', JSON.stringify(opts.pacUrl))
  } else if (opts.proxy) {
    push('network.proxy.type', '1')
    // The deployment always points at either the remote proxy directly or
    // the local relay; both are plain "manual proxy" targets.
    const url = new URL(opts.proxy.proxyServer)
    const host = url.hostname
    const port = Number(url.port || 80)
    const isSocks = url.protocol === 'socks5:' || url.protocol === 'socks4:'
    push('network.proxy.http', JSON.stringify(host))
    push('network.proxy.http_port', String(port))
    push('network.proxy.ssl', JSON.stringify(host))
    push('network.proxy.ssl_port', String(port))
    if (isSocks) {
      push('network.proxy.socks', JSON.stringify(host))
      push('network.proxy.socks_port', String(port))
      push('network.proxy.socks_version', url.protocol === 'socks5:' ? '5' : '4')
      push('network.proxy.socks_remote_dns', 'true')
    } else {
      push('network.proxy.socks', '""')
      push('network.proxy.socks_port', '0')
    }
    push('signon.autologin.proxy', 'true')
  } else {
    push('network.proxy.type', '0') // direct — never inherit system proxy
  }

  // --- user-agent / platform overrides (authoritative in Firefox) ----------
  if (fingerprint.userAgent) {
    push('general.useragent.override', JSON.stringify(fingerprint.userAgent))
    push('general.platform.override', JSON.stringify(fingerprint.platform || ''))
    if (fingerprint.oscpu) push('general.oscpu.override', JSON.stringify(fingerprint.oscpu))
  }
  if (fingerprint.language) {
    const accept =
      opts.acceptLanguage ??
      (fingerprint.languages && fingerprint.languages.length
        ? fingerprint.languages.join(',')
        : fingerprint.language)
    push('intl.accept_languages', JSON.stringify(accept))
  }

  // --- fingerprinting settings ---------------------------------------------
  push('privacy.resistFingerprinting', 'false') // we do our own masking
  push('dom.webdriver.enabled', 'false')
  push('webdriver.remote.enabled', 'false') // Firefox 116+

  // --- extension sideloading -----------------------------------------------
  push('extensions.autoDisableScopes', '0') // never auto-disable our add-on
  push('extensions.enabledScopes', '15')
  push('extensions.webextensions.warnings-as-errors', 'false')
  push('xpinstall.signatures.required', 'false')
  push('extensions.update.enabled', 'false')

  // --- telemetry / data collection: OFF ------------------------------------
  push('toolkit.telemetry.enabled', 'false')
  push('toolkit.telemetry.unified', 'false')
  push('datareporting.policy.dataSubmissionEnabled', 'false')
  push('datareporting.healthreport.uploadEnabled', 'false')
  push('browser.ping-centre.telemetry', 'false')
  push('app.shield.optoutstudies.enabled', 'false')
  push('browser.newtabpage.activity-stream.feeds.telemetry', 'false')
  push('browser.tabs.crashReporting.sendReport', 'false')
  push('browser.crashReports.unsubmittedCheck.enabled', 'false')
  push('breakpad.reportURL', '""')

  // --- updates / first-run noise -------------------------------------------
  push('app.update.auto', 'false')
  push('app.update.enabled', 'false')
  push('browser.shell.checkDefaultBrowser', 'false')
  push('browser.startup.homepage_override.mstone', '"ignore"')
  push('browser.startup.homepage_welcome_url', '"about:blank"')
  push('browser.aboutwelcome.enabled', 'false')
  push('startup.homepage_welcome_url', '"about:blank"')
  push('browser.sessionstore.resume_from_crash', 'false')
  push('browser.tabs.warnOnClose', 'false')

  writeFileSync(join(fp, 'user.js'), prefs.join('\n') + '\n', 'utf-8')
  logger.debug('Wrote Firefox user.js for', profileDir)
}

/** Install the built stealth .xpi into a Firefox profile's extensions dir. */
export function installXpi(profileDir: string, xpiPath: string): void {
  const extDir = join(profileDir, 'extensions')
  mkdirSync(extDir, { recursive: true })
  copyFileSync(xpiPath, join(extDir, FIREFOX_EXT_ID + '.xpi'))
  logger.debug('Installed stealth XPI into', extDir)
}

/** Full provisioning: user.js + xpi installation. */
export function provisionFirefoxProfile(
  profile: ProfileData,
  profileDir: string,
  opts: Omit<FirefoxPrefsOptions, 'fingerprint'>
): void {
  writeFirefoxUserJs(profileDir, { ...opts, fingerprint: profile.fingerprint })
  const xpiPath = buildFirefoxXpi(profile, join(profileDir, '.stealth-build'))
  installXpi(profileDir, xpiPath)
}
