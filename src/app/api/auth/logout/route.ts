import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  
  // Check if we have a session
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    await supabase.auth.signOut()
  }
  
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!), {
    status: 302,
  })
}
