/**
 * Proxy tester — verifies a proxy before launching a profile.
 *
 * Uses https-proxy-agent / socks-proxy-agent to make a request THROUGH the
 * proxy to ipify (IP echo) and then geolocates the resulting IP via
 * ip-api.com (free, no key). Latency is measured around the IP echo call.
 * All traffic goes through the proxy being tested.
 */
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import type { ProxyConfig, ProxyTestResult } from '@shared/types'
import { logger } from '../logger'

const TIMEOUT_MS = 15000

function agentFor(config: ProxyConfig): { agent: import('node:http').Agent; isSocks: boolean } {
  const { type, host, port, username, password } = config
  const auth = username || password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}` : ''
  const url =
    type === 'socks5' || type === 'socks4'
      ? `socks${type === 'socks5' ? '5' : '4'}://${auth ? auth + '@' : ''}${host}:${port}`
      : `http://${auth ? auth + '@' : ''}${host}:${port}`
  if (type === 'socks5' || type === 'socks4') {
    return { agent: new SocksProxyAgent(url), isSocks: true }
  }
  return { agent: new HttpsProxyAgent(url), isSocks: false }
}

function fetchVia(
  agent: import('node:http').Agent,
  targetUrl: string,
  timeoutMs: number
): Promise<{ body: string; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl)
    const mod = url.protocol === 'https:' ? httpsRequest : httpRequest
    const started = Date.now()
    const req = mod(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        agent,
        headers: { 'User-Agent': 'StealthBrowser/1.0 (proxy-test)' },
        timeout: timeoutMs
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          resolve({ body: Buffer.concat(chunks).toString('utf-8'), latencyMs: Date.now() - started })
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', (e) => reject(e))
  })
}

export async function testProxy(config: ProxyConfig): Promise<ProxyTestResult> {
  const fail = (error: string): ProxyTestResult => ({
    ok: false,
    ip: '',
    country: '',
    region: '',
    city: '',
    isp: '',
    latencyMs: 0,
    error
  })

  if (!config.enabled) return fail('Proxy is disabled on this profile.')
  if (!config.host || !config.port) return fail('Proxy host/port missing.')

  const { agent } = agentFor(config)
  const started = Date.now()

  try {
    const ipResult = await fetchVia(agent, 'https://api.ipify.org?format=json', TIMEOUT_MS)
    let ip = ''
    try {
      ip = (JSON.parse(ipResult.body) as { ip: string }).ip ?? ''
    } catch {
      ip = ipResult.body.trim()
    }
    if (!ip) return fail('Proxy responded without an IP address.')

    // Geolocate the IP (direct request — geo data is keyed by the IP itself).
    let country = ''
    let region = ''
    let city = ''
    let isp = ''
    try {
      const geo = await fetchVia(
        agent,
        `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`,
        8000
      )
      const data = JSON.parse(geo.body) as {
        status: string
        country?: string
        regionName?: string
        city?: string
        isp?: string
      }
      if (data.status === 'success') {
        country = data.country ?? ''
        region = data.regionName ?? ''
        city = data.city ?? ''
        isp = data.isp ?? ''
      }
    } catch {
      /* geo info optional */
    }

    return {
      ok: true,
      ip,
      country,
      region,
      city,
      isp,
      latencyMs: Date.now() - started,
      error: ''
    }
  } catch (e) {
    logger.warn('Proxy test failed', e)
    const msg = e instanceof Error ? e.message : String(e)
    return fail(`Connection failed: ${msg}`)
  }
}
