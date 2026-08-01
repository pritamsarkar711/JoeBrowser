/**
 * Tiny local PAC (Proxy Auto-Config) server.
 *
 * Serves a PAC script on 127.0.0.1:<random port> so browsers can be pointed
 * at --proxy-pac-url=http://127.0.0.1:<port>/proxy.pac. Used when a profile
 * specifies a custom PAC file, or to force ALL traffic through a given proxy.
 */
import { createServer, type Server } from 'node:http'

export interface PacServer {
  url: string
  close: () => Promise<void>
}

export function pacFileForProxy(host: string, port: number, type: 'http' | 'https' | 'socks5' | 'socks4'): string {
  const scheme =
    type === 'socks5' || type === 'socks4'
      ? type === 'socks5'
        ? 'SOCKS5'
        : 'SOCKS4'
      : 'PROXY'
  const target = `${scheme} ${host}:${port}`
  // localhost / loopback always bypass the proxy so the app's own servers
  // (fingerprint test page, etc.) never go through the proxy.
  return `function FindProxyForURL(url, host) {
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1' ||
      /^(\\d{1,3}\\.){3}\\d{1,3}$/.test(host)) {
    return 'DIRECT';
  }
  return '${target}';
}`
}

export function startPacServer(pacScript: string): Promise<PacServer> {
  const server: Server = createServer((req, res) => {
    if (req.url === '/proxy.pac' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/x-ns-proxy-autoconfig', 'Cache-Control': 'no-store' })
      res.end(pacScript)
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        resolve({
          url: `http://127.0.0.1:${address.port}/proxy.pac`,
          close: () =>
            new Promise<void>((res) => {
              server.close(() => res())
            })
        })
      } else {
        reject(new Error('PAC server failed to bind'))
      }
    })
  })
}
