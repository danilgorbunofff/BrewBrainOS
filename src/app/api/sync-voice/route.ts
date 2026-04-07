import { NextRequest, NextResponse } from 'next/server'
import { processVoiceLog } from '@/app/actions/voice'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const result = await processVoiceLog(formData)
    
    if (result && result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: result?.error }, { status: 400 })
    }
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
