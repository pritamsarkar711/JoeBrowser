/**
 * Minimal local logger: writes to the console AND a rotating log file
 * inside the app data directory. No network, ever.
 */
import { appendFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let logDir: string | null = null
const MAX_LOG_SIZE = 2 * 1024 * 1024 // 2 MB, then rotate

export function initLogger(dir: string): void {
  logDir = dir
  mkdirSync(dir, { recursive: true })
}

function logFilePath(): string {
  return join(logDir ?? '.', 'app.log')
}

function rotateIfNeeded(): void {
  const file = logFilePath()
  try {
    if (statSync(file).size > MAX_LOG_SIZE) {
      writeFileSync(file, '', 'utf-8') // truncate; a full rotation setup is overkill here
    }
  } catch {
    /* no log file yet */
  }
}

function write(level: LogLevel, msg: string): void {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
  if (logDir) {
    try {
      rotateIfNeeded()
      appendFileSync(logFilePath(), line + '\n')
    } catch {
      /* logging must never crash the app */
    }
  }
}

export const logger = {
  debug: (msg: string, ...args: unknown[]): void => write('debug', format(msg, args)),
  info: (msg: string, ...args: unknown[]): void => write('info', format(msg, args)),
  warn: (msg: string, ...args: unknown[]): void => write('warn', format(msg, args)),
  error: (msg: string, ...args: unknown[]): void => write('error', format(msg, args))
}

function format(msg: string, args: unknown[]): string {
  if (args.length === 0) return msg
  try {
    return msg + ' ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  } catch {
    return msg
  }
}
