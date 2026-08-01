/**
 * Local proxy relay.
 *
 * Problem: Chromium cannot pass credentials to a remote proxy
 * (--proxy-server ignores user:pass, and PAC cannot express SOCKS auth).
 *
 * Solution: for any proxy that needs authentication (or SOCKS4, which
 * Chromium does not support), start a tiny local relay on 127.0.0.1:
 *
 *  - HTTP(S) upstream  -> local HTTP proxy that adds Proxy-Authorization
 *  - SOCKS5 upstream   -> local SOCKS5 server that authenticates to the
 *                         remote server, then relays raw TCP
 *  - SOCKS4 upstream   -> same local SOCKS5 server speaking SOCKS5 to the
 *                         remote server
 *
 * The browser only ever talks to 127.0.0.1 with no credentials.
 * Each profile launch gets its own relay instance on its own port.
 */
import { createServer, connect as netConnect, type Server } from 'node:net'
import { connect as tlsConnect, type ConnectionOptions } from 'node:tls'
import type { ProxyConfig } from '@shared/types'
import { logger } from '../logger'

export interface RelayInfo {
  /** Host the browser should use (always 127.0.0.1). */
  host: string
  port: number
  close: () => Promise<void>
}

/** SOCKS5 client handshake (RFC 1928 + RFC 1929 auth). */
function socks5Connect(
  upstream: { host: string; port: number; username?: string; password?: string },
  targetHost: string,
  targetPort: number,
  type: 'socks5' | 'socks4'
): Promise<{ socket: import('node:net').Socket }> {
  return new Promise((resolve, reject) => {
    const socket = netConnect(upstream.port, upstream.host)
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error('Relay: timeout connecting to SOCKS upstream'))
    }, 15000)

    const fail = (err: Error): void => {
      clearTimeout(timeout)
      socket.destroy()
      reject(err)
    }

    if (type === 'socks5') {
      let step: 'greet' | 'auth' | 'connect' = 'greet'
      const hasAuth = !!(upstream.username || upstream.password)
      const methods = hasAuth ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00])

      socket.on('error', fail)
      socket.on('connect', () => socket.write(methods))

      const buf: number[] = []
      socket.on('data', (chunk: Buffer) => {
        for (const byte of chunk) {
          buf.push(byte)
          try {
            if (step === 'greet' && buf.length >= 2) {
              const [ver, method] = [buf[0], buf[1]]
              buf.length = 0
              if (ver !== 5) return fail(new Error('Relay: upstream is not SOCKS5'))
              if (method === 0xff) return fail(new Error('Relay: upstream refused auth methods'))
              if (method === 0x02) {
                // Username/password auth
                step = 'auth'
                const u = Buffer.from(upstream.username ?? '', 'utf-8')
                const p = Buffer.from(upstream.password ?? '', 'utf-8')
                socket.write(Buffer.concat([Buffer.from([0x01, u.length]), u, Buffer.from([p.length]), p]))
              } else {
                step = 'connect'
                socket.write(socks5ConnectRequest(targetHost, targetPort))
              }
            } else if (step === 'auth' && buf.length >= 2) {
              const [ver, status] = [buf[0], buf[1]]
              buf.length = 0
              if (ver !== 1 || status !== 0) return fail(new Error('Relay: SOCKS5 auth failed'))
              step = 'connect'
              socket.write(socks5ConnectRequest(targetHost, targetPort))
            } else if (step === 'connect' && buf.length >= 4) {
              const rep = buf[1]
              if (rep !== 0) return fail(new Error('Relay: SOCKS5 connect failed, code ' + rep))
              // Consume the full reply (varies by ATYP)
              const atyp = buf[3]
              const need = atyp === 0x01 ? 10 : atyp === 0x04 ? 22 : atyp === 0x03 ? (7 + (buf[4] ?? 0)) : 10
              if (buf.length >= need) {
                clearTimeout(timeout)
                buf.length = 0
                resolve({ socket })
              }
            }
          } catch (e) {
            fail(e as Error)
          }
        }
      })
    } else {
      // SOCKS4 (no auth; relay always converts to SOCKS5 upstream)
      const hasAuth = !!(upstream.username || upstream.password)
      const u = Buffer.from(upstream.username ?? '', 'utf-8')
      const isV4a = !/^\d+\.\d+\.\d+\.\d+$/.test(targetHost)
      const hostBuf = isV4a
        ? Buffer.from([0, 0, 0, 1])
        : Buffer.from(targetHost.split('.').map((n) => Number(n)))
      const portBuf = Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff])
      const cmd = hasAuth ? 0x03 : 0x01
      const request = Buffer.concat([
        Buffer.from([0x04, cmd]),
        portBuf,
        hostBuf,
        u,
        Buffer.from([0]),
        isV4a ? Buffer.from(targetHost, 'utf-8') : Buffer.alloc(0),
        Buffer.from([0])
      ])
      socket.on('error', fail)
      socket.on('connect', () => socket.write(request))
      const buf: number[] = []
      socket.on('data', (chunk: Buffer) => {
        for (const byte of chunk) {
          buf.push(byte)
          if (buf.length >= 8) {
            if (buf[0] !== 0 || buf[1] !== 0x5a) {
              return fail(new Error('Relay: SOCKS4 connect failed, code 0x' + buf[1].toString(16)))
            }
            clearTimeout(timeout)
            resolve({ socket })
          }
        }
      })
    }
  })
}

function socks5ConnectRequest(host: string, port: number): Buffer {
  const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(host)
  const portBuf = Buffer.from([(port >> 8) & 0xff, port & 0xff])
  if (isIP) {
    return Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x01]), Buffer.from(host.split('.').map(Number)), portBuf])
  }
  const hostBuf = Buffer.from(host, 'utf-8')
  return Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]), hostBuf, portBuf])
}

// ---------------------------------------------------------------------------
// Local HTTP proxy (for HTTP/HTTPS upstreams, adds Proxy-Authorization)
// ---------------------------------------------------------------------------

function startHttpRelay(upstream: ProxyConfig): Promise<{ port: number; close: () => void }> {
  const authHeader =
    upstream.username || upstream.password
      ? 'Basic ' + Buffer.from(`${upstream.username}:${upstream.password}`).toString('base64')
      : null

  const upstreamOptions = (): ConnectionOptions => ({
    host: upstream.host,
    port: upstream.port,
    // Note: rejectUnauthorized=false allows MITM on the proxy path.
    // This is needed for some corporate/self-signed proxy servers.
    // Users should ensure their proxy infrastructure is trusted.
    rejectUnauthorized: false
  })

  const server: Server = createServer((clientSocket) => {
    let buffer = Buffer.alloc(0)
    let done = false

    const teardown = (): void => {
      clientSocket.destroy()
    }

    clientSocket.on('error', teardown)
    clientSocket.on('data', (chunk: Buffer) => {
      if (done) return
      buffer = Buffer.concat([buffer, chunk])
      const headerEnd = buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) {
        if (buffer.length > 64 * 1024) return teardown()
        return
      }

      const head = buffer.subarray(0, headerEnd).toString('utf-8')
      const lines = head.split('\r\n')
      const [method, target] = lines[0].split(' ')
      done = true

      if (method === 'CONNECT') {
        const [host, portStr] = target.split(':')
        const port = Number(portStr ?? 443)
        const upstreamSocket = netConnect(upstream.port, upstream.host, () => {
          upstreamSocket.write(
            `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n` +
              (authHeader ? `Proxy-Authorization: ${authHeader}\r\n` : '') +
              '\r\n'
          )
        })
        let upBuf = Buffer.alloc(0)
        upstreamSocket.on('data', (d: Buffer) => {
          upBuf = Buffer.concat([upBuf, d])
          const idx = upBuf.indexOf('\r\n\r\n')
          if (idx !== -1) {
            const statusLine = upBuf.subarray(0, idx).toString('utf-8').split('\r\n')[0]
            if (statusLine.includes(' 200')) {
              clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
              clientSocket.pipe(upstreamSocket)
              upstreamSocket.pipe(clientSocket)
            } else {
              clientSocket.write(upBuf.subarray(0, idx + 4))
              clientSocket.end()
            }
            upBuf = Buffer.alloc(0)
          }
        })
        upstreamSocket.on('error', () => clientSocket.end())
      } else {
        // Plain HTTP request — forward with absolute URI.
        const isHttpsUpstream = upstream.type === 'https'
        const connectFn = (
          isHttpsUpstream ? tlsConnect : netConnect
        ) as (opts: ConnectionOptions, cb: () => void) => import('node:net').Socket
        const opts = isHttpsUpstream
          ? { ...upstreamOptions(), servername: upstream.host }
          : upstreamOptions()
        const upstreamSocket = connectFn(opts, () => {
          const headers = lines
            .slice(1)
            .filter((l) => !/^proxy-(authorization|connection):/i.test(l))
            .join('\r\n')
          upstreamSocket.write(
            `${method} ${target} HTTP/1.1\r\n` +
              (authHeader ? `Proxy-Authorization: ${authHeader}\r\n` : '') +
              headers +
              '\r\n\r\n'
          )
        })
        upstreamSocket.on('error', () => clientSocket.end())
        clientSocket.pipe(upstreamSocket)
        upstreamSocket.pipe(clientSocket)
      }
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        resolve({
          port: address.port,
          close: () => server.close()
        })
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Local SOCKS5 server (for SOCKS5/SOCKS4 upstreams with auth)
// ---------------------------------------------------------------------------

function startSocksRelay(upstream: ProxyConfig): Promise<{ port: number; close: () => void }> {
  const server: Server = createServer((clientSocket) => {
    // No-auth greeting only (local server, 127.0.0.1 only).
    let step: 'greet' | 'request' = 'greet'
    const buf: number[] = []

    clientSocket.on('error', () => clientSocket.destroy())
    clientSocket.on('data', (chunk: Buffer) => {
      for (const byte of chunk) {
        buf.push(byte)
        try {
          if (step === 'greet' && buf.length >= 2) {
            const nmethods = buf[1]
            if (buf.length >= 2 + nmethods) {
              buf.length = 0
              step = 'request'
              clientSocket.write(Buffer.from([0x05, 0x00])) // no auth
            }
          } else if (step === 'request' && buf.length >= 4) {
            const ver = buf[0]
            const atyp = buf[3]
            if (ver !== 5) return clientSocket.destroy()
            let need = 4
            if (atyp === 0x01) need = 10
            else if (atyp === 0x04) need = 22
            else need = 4 + 1 + buf[4] + 2
            if (buf.length < need) return
            // Extract target BEFORE clearing the buffer.
            let host = ''
            let port = 0
            if (atyp === 0x03) {
              const len = buf[4]
              host = Buffer.from(buf.slice(5, 5 + len)).toString('utf-8')
              port = buf[5 + len] * 256 + buf[6 + len]
            } else if (atyp === 0x01) {
              host = buf.slice(4, 8).join('.')
              port = buf[8] * 256 + buf[9]
            } else if (atyp === 0x04) {
              // IPv6: 16 bytes address + 2 bytes port
              const ipv6Parts: string[] = []
              for (let i = 4; i < 20; i += 2) {
                ipv6Parts.push(((buf[i] << 8) | buf[i + 1]).toString(16))
              }
              host = ipv6Parts.join(':')
              port = buf[20] * 256 + buf[21]
            } else {
              return clientSocket.destroy()
            }
            buf.length = 0
            void relayClient(host, port, clientSocket, upstream)
          }
        } catch {
          clientSocket.destroy()
        }
      }
    })
  })

  const relayClient = (
    host: string,
    port: number,
    clientSocket: import('node:net').Socket,
    upstream: ProxyConfig
  ): void => {
    socks5Connect(
      { host: upstream.host, port: upstream.port, username: upstream.username, password: upstream.password },
      host,
      port,
      upstream.type === 'socks5' ? 'socks5' : 'socks4'
    )
      .then(({ socket: upstreamSocket }) => {
        clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
        clientSocket.pipe(upstreamSocket)
        upstreamSocket.pipe(clientSocket)
      })
      .catch(() => {
        clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
        clientSocket.end()
      })
  }

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        resolve({ port: address.port, close: () => server.close() })
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProxyDeployment {
  /** Browser-facing proxy URL (for --proxy-server / prefs). */
  proxyServer: string
  /** True when the URL points at the local relay. */
  viaRelay: boolean
  close: () => Promise<void>
}

/**
 * Decide how the given proxy must be deployed for a browser process.
 * Returns the value for --proxy-server / network.proxy.http etc.
 */
export async function deployProxy(config: ProxyConfig): Promise<ProxyDeployment> {
  const needsAuth = !!(config.username || config.password)
  const isSocks = config.type === 'socks5' || config.type === 'socks4'
  const port = config.port

  // Direct connection — no proxy needed
  if (!isSocks && !needsAuth && config.pacUrl.trim() === '') {
    return { proxyServer: `http://${config.host}:${port}`, viaRelay: false, close: async () => {} }
  }

  // SOCKS without auth: pass straight through (Chromium supports socks5/socks4)
  if (isSocks && !needsAuth && config.pacUrl.trim() === '') {
    const scheme = config.type === 'socks5' ? 'socks5' : 'socks4'
    return { proxyServer: `${scheme}://${config.host}:${port}`, viaRelay: false, close: async () => {} }
  }

  // Everything else: local relay
  logger.info('Starting local proxy relay for', config.type, config.host + ':' + config.port)
  const relay = isSocks ? await startSocksRelay(config) : await startHttpRelay(config)
  const scheme = isSocks ? 'socks5' : 'http'
  const proxyServer = `${scheme}://127.0.0.1:${relay.port}`
  return {
    proxyServer,
    viaRelay: true,
    close: () =>
      new Promise<void>((resolve) => {
        try {
          relay.close()
        } catch {
          /* already closed */
        }
        resolve()
      })
  }
}
