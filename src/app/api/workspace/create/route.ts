import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  console.log('[API] /api/workspace/create called')
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[API] Auth check:', { userId: user?.id, authError: authError?.message })

    if (authError || !user) {
      console.error('[API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a workspace
    const { data: existingMemberships, error: memberCheckError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)

    console.log('[API] Existing memberships check:', { existingMemberships, memberCheckError })

    if (existingMemberships && existingMemberships.length > 0) {
      console.log('[API] User already has workspace:', existingMemberships[0].workspace_id)
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

    console.log('[API] Creating workspace with service client')

    // Create workspace
    const { data: workspace, error: workspaceError } = await serviceClient
      .from('workspaces')
      .insert({
        name: `${user.email?.split('@')[0]}'s Workspace`,
        created_by: user.id,
      })
      .select()
      .single()

    console.log('[API] Workspace creation result:', { workspace, workspaceError })

    if (workspaceError) {
      console.error('[API] Error creating workspace:', workspaceError)
      return NextResponse.json({
        error: 'Failed to create workspace',
        details: workspaceError.message
      }, { status: 500 })
    }

    console.log('[API] Adding user as workspace owner')

    // Add user as owner
    const { error: memberError } = await serviceClient
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      })

    console.log('[API] Workspace member creation result:', { memberError })

    if (memberError) {
      console.error('[API] Error adding user to workspace:', memberError)
      return NextResponse.json({
        error: 'Failed to add user to workspace',
        details: memberError.message
      }, { status: 500 })
    }

    console.log('[API] Workspace created successfully:', workspace.id)

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        created_by: workspace.created_by,
        created_at: workspace.created_at,
      }
    })
  } catch (error) {
    console.error('Error in workspace creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
