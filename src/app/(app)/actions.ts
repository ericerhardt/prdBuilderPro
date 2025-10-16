'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signOut() {
  const supabase = await createServerSupabaseClient()

  // Sign out from Supabase
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
  }

  // Clear auth cookies
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  allCookies.forEach(cookie => {
    if (cookie.name.includes('auth') || cookie.name.includes('supabase')) {
      cookieStore.delete(cookie.name)
    }
  })

  // Redirect to login page
  redirect('/login')
}
