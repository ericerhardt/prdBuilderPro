import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a workspace
    const { data: existingMemberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)

    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json({
        error: 'User already has a workspace',
        workspaceId: existingMemberships[0].workspace_id
      }, { status: 400 })
    }

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
        name: `${user.email?.split('@')[0]}'s Workspace`,
        created_by: user.id,
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError)
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }

    // Add user as owner
    const { error: memberError } = await serviceClient
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Error adding user to workspace:', memberError)
      return NextResponse.json({ error: 'Failed to add user to workspace' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      }
    })
  } catch (error) {
    console.error('Error in workspace creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
