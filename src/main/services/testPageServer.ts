/**
 * Local HTTP server that serves the built-in fingerprint test page.
 *
 * The test page is imported as a raw string at build time (see
 * assets/fingerprint-test.html) and served over http://127.0.0.1:<port>/,
 * so the launched browser can open it with the stealth extension injected
 * (content scripts do not reliably run on file:// pages).
 */
import { createServer, type Server } from 'node:http'
import testPage from '../assets/fingerprint-test.html?raw'
import { logger } from '../logger'

export interface TestPageServer {
  url: string
  close: () => Promise<void>
}

let activeServer: Server | null = null
let activePort = 0

export async function startTestPageServer(): Promise<TestPageServer> {
  if (activeServer) {
    return { url: `http://127.0.0.1:${activePort}/`, close: closeTestPageServer }
  }
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(testPage)
  })
  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  activeServer = server
  activePort = (server.address() as { port: number }).port
  logger.info('Fingerprint test page server on 127.0.0.1:' + activePort)
  return { url: `http://127.0.0.1:${activePort}/`, close: closeTestPageServer }
}

export async function closeTestPageServer(): Promise<void> {
  if (activeServer) {
    const server = activeServer
    activeServer = null
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
