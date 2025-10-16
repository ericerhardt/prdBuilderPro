import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  try {
    // 1. Check environment variables
    results.checks.env = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }

    // 2. Check authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    results.checks.auth = {
      success: !authError,
      error: authError?.message,
      userId: user?.id,
      userEmail: user?.email,
    }

    // 3. Check if tables exist using service role
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

    // Check workspaces table
    const { data: workspacesData, error: workspacesError } = await serviceClient
      .from('workspaces')
      .select('count', { count: 'exact', head: true })

    results.checks.tables = {
      workspaces: {
        exists: !workspacesError,
        error: workspacesError?.message,
        count: workspacesData,
      }
    }

    // Check workspace_members table
    const { data: membersData, error: membersError } = await serviceClient
      .from('workspace_members')
      .select('count', { count: 'exact', head: true })

    results.checks.tables.workspace_members = {
      exists: !membersError,
      error: membersError?.message,
      count: membersData,
    }

    // Check platforms table
    const { data: platformsData, error: platformsError } = await serviceClient
      .from('platforms')
      .select('*')

    results.checks.tables.platforms = {
      exists: !platformsError,
      error: platformsError?.message,
      count: platformsData?.length || 0,
      data: platformsData,
    }

    // 4. If user is authenticated, check their workspace memberships
    if (user) {
      const { data: userWorkspaces, error: userWorkspacesError } = await serviceClient
        .from('workspace_members')
        .select(`
          role,
          workspace:workspaces (
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id)

      results.checks.userWorkspaces = {
        success: !userWorkspacesError,
        error: userWorkspacesError?.message,
        count: userWorkspaces?.length || 0,
        workspaces: userWorkspaces,
      }
    }

    // 5. Check RLS policies
    const { data: policies, error: policiesError } = await serviceClient
      .rpc('pg_policies', {})
      .select('*')
      .eq('schemaname', 'public')
      .in('tablename', ['workspaces', 'workspace_members'])

    results.checks.rls = {
      success: !policiesError,
      error: policiesError?.message,
      note: policiesError ? 'Could not fetch RLS policies - this is normal if function does not exist' : 'RLS check attempted',
    }

    results.overall = {
      supabaseConnected: !!results.checks.env.NEXT_PUBLIC_SUPABASE_URL,
      userAuthenticated: !!user,
      tablesExist: results.checks.tables.workspaces.exists && results.checks.tables.workspace_members.exists,
      userHasWorkspace: results.checks.userWorkspaces?.count > 0,
    }

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check Supabase connection',
      message: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
