/**
 * BrewBrain Universal Logger
 * 
 * This logger works in both Client and Server components.
 * - In Client: Sends logs to /api/logs endpoint to be written to disk.
 * - In Server: Writes directly to 'brewbrain.log' in the project root.
 */

const LOG_FILE = 'brewbrain.log'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogPayload {
  level: LogLevel
  message: string
  timestamp: string
  context?: unknown
}

async function sendToApi(payload: LogPayload) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    // Fallback to console if logging fails
    console.warn('Logging to API failed:', err)
  }
}

async function writeToDisk(payload: LogPayload) {
  // We only dynamic import fs when on server to avoid bundling issues in client
  if (typeof window === 'undefined') {
    const fs = await import('fs')
    const path = await import('path')
    
    // PROJECT_ROOT/brewbrain.log
    const filePath = path.join(process.cwd(), LOG_FILE)
    const logEntry = `[${payload.timestamp}] [${payload.level.toUpperCase()}] ${payload.message} ${payload.context ? JSON.stringify(payload.context) : ''}\n`
    
    try {
      fs.appendFileSync(filePath, logEntry)
    } catch (err) {
      console.warn('Writing to log file failed:', err)
    }
  }
}

export const logger = {
  log: async (level: LogLevel, message: string, context?: unknown) => {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    // Always log to console for developer visibility
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '')

    if (typeof window !== 'undefined') {
      // CLIENT SIDE
      await sendToApi(payload)
    } else {
      // SERVER SIDE
      await writeToDisk(payload)
    }
  },

  info: (message: string, context?: unknown) => logger.log('info', message, context),
  warn: (message: string, context?: unknown) => logger.log('warn', message, context),
  error: (message: string, context?: unknown) => logger.log('error', message, context),
  debug: (message: string, context?: unknown) => logger.log('debug', message, context),
}
