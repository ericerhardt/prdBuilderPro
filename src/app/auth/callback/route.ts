import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }

    // If user successfully authenticated, ensure they have a workspace
    if (data.user) {
      try {
        // Check if user already has a workspace
        const { data: existingMemberships } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', data.user.id)
          .limit(1)

        // If no workspace exists, create one using service role
        if (!existingMemberships || existingMemberships.length === 0) {
          console.log('Creating initial workspace for user:', data.user.id)

          // Use service role client to bypass RLS
          const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )

          // Create workspace
          const { data: workspace, error: workspaceError } = await serviceClient
            .from('workspaces')
            .insert({
              name: `${data.user.email?.split('@')[0]}'s Workspace`,
              created_by: data.user.id,
            })
            .select()
            .single()

          if (workspaceError) {
            console.error('Error creating workspace:', workspaceError)
          } else if (workspace) {
            // Add user as owner
            const { error: memberError } = await serviceClient
              .from('workspace_members')
              .insert({
                workspace_id: workspace.id,
                user_id: data.user.id,
                role: 'owner',
              })

            if (memberError) {
              console.error('Error adding user to workspace:', memberError)
            } else {
              console.log('Successfully created workspace and added user as owner')
            }
          }
        }
      } catch (error) {
        console.error('Error ensuring workspace exists:', error)
        // Don't block the auth flow if workspace creation fails
      }
    }
  }

  // URL to redirect to after sign in process completes
  // Default to builder page if no redirect_to is specified
  const redirectUrl = redirectTo || '/builder'
  return NextResponse.redirect(`${origin}${redirectUrl}`)
}
