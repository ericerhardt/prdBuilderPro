import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'

/**
 * Server-side check if the current user is an app-level admin
 * Use this in Server Components, Server Actions, and API Routes
 */
export async function isAppAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return false
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_app_admin')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return false
  }

  return profile.is_app_admin === true
}

/**
 * Server-side function to get the current user's admin status along with user info
 * Returns null if not authenticated
 */
export async function getCurrentUserAdminStatus(): Promise<{
  userId: string
  email: string | undefined
  isAdmin: boolean
} | null> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_app_admin')
    .eq('user_id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.email,
    isAdmin: profile?.is_app_admin === true
  }
}

/**
 * Client-side check if the current user is an app-level admin
 * Use this in Client Components
 */
export async function isAppAdminClient(): Promise<boolean> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return false
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_app_admin')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return false
  }

  return profile.is_app_admin === true
}
