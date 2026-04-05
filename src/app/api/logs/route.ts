import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { timestamp, level, message, context } = payload

    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${context ? JSON.stringify(context) : ''}\n`
    const filePath = path.join(process.cwd(), 'brewbrain.log')

    fs.appendFileSync(filePath, logEntry)
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to write to brewbrain.log:', err)
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }
}
