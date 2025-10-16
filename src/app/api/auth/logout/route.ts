import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  // Check if we have a session
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  // Clear any auth cookies
  const cookieStore = await cookies()
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.includes('auth')) {
      cookieStore.delete(cookie.name)
    }
  })

  // Get the origin from the request
  const origin = request.nextUrl.origin

  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  })
}
