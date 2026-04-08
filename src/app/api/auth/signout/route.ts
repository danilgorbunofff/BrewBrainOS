import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { ACTIVE_BREWERY_COOKIE } from '@/lib/active-brewery'
import { createClient } from '@/utils/supabase/server'

const LOGIN_PATH = '/login'

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json') ?? false
}

function clearSessionCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const cookieNames = new Set(
    cookieStore
      .getAll()
      .map(({ name }) => name)
      .filter((name) => name === ACTIVE_BREWERY_COOKIE || name.startsWith('sb-')),
  )

  cookieNames.forEach((name) => {
    cookieStore.delete(name)
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = await createClient()

  await supabase.auth.signOut()
  clearSessionCookies(cookieStore)

  if (wantsJson(request)) {
    return NextResponse.json({ success: true, redirectTo: LOGIN_PATH })
  }

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
}