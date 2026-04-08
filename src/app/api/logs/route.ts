import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { withSentry } from '@/lib/with-sentry'
import { createClient } from '@/utils/supabase/server'

const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error'])
const MAX_MESSAGE_LENGTH = 2000
const MAX_CONTEXT_LENGTH = 4000

export const POST = withSentry(async (req: Request) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json()
  const { timestamp, level, message, context } = payload

  if (typeof timestamp !== 'string' || typeof level !== 'string' || typeof message !== 'string') {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
  }

  if (!VALID_LEVELS.has(level.toLowerCase())) {
    return NextResponse.json({ success: false, error: 'Invalid log level' }, { status: 400 })
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ success: false, error: 'Message too long' }, { status: 400 })
  }

  const contextStr = context ? JSON.stringify(context) : ''
  if (contextStr.length > MAX_CONTEXT_LENGTH) {
    return NextResponse.json({ success: false, error: 'Context too large' }, { status: 400 })
  }

  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}\n`
  const filePath = path.join(process.cwd(), 'brewbrain.log')

  fs.appendFileSync(filePath, logEntry)

  return NextResponse.json({ success: true })
}, {
  name: 'api/logs',
  onError: () => NextResponse.json({ success: false, error: 'Failed to log' }, { status: 500 }),
})
