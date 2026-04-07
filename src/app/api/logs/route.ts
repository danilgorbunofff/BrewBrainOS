import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { withSentry } from '@/lib/with-sentry'

export const POST = withSentry(async (req: Request) => {
  const payload = await req.json()
  const { timestamp, level, message, context } = payload

  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${context ? JSON.stringify(context) : ''}\n`
  const filePath = path.join(process.cwd(), 'brewbrain.log')

  fs.appendFileSync(filePath, logEntry)

  return NextResponse.json({ success: true })
}, {
  name: 'api/logs',
  onError: () => NextResponse.json({ success: false, error: 'Failed to log' }, { status: 500 }),
})
