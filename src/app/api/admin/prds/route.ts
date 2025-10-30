import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseServiceClient } from '@/lib/supabase/server'
import { isAppAdmin } from '@/lib/auth/admin'

// GET /api/admin/prds - Fetch all PRDs across all workspaces (admin only)
export async function GET() {
  try {
    // First, check authentication using regular client
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an app admin
    const adminCheck = await isAppAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Use service role client to bypass RLS and fetch all PRDs
    const serviceSupabase = await createServerSupabaseServiceClient()

    const { data: prds, error: prdsError } = await serviceSupabase
      .from('prd_documents')
      .select(`
        *,
        workspaces (
          id,
          name
        )
      `)
      .order('updated_at', { ascending: false })

    if (prdsError) {
      console.error('Error fetching PRDs:', prdsError)
      throw prdsError
    }

    return NextResponse.json(prds || [])
  } catch (error) {
    console.error('Error in admin PRDs route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PRDs' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/prds?id=xxx - Delete a PRD (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an app admin
    const adminCheck = await isAppAdmin()
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const prdId = request.nextUrl.searchParams.get('id')
    if (!prdId) {
      return NextResponse.json({ error: 'PRD ID required' }, { status: 400 })
    }

    // Use service role client to bypass RLS and delete the PRD
    const serviceSupabase = await createServerSupabaseServiceClient()

    const { error } = await serviceSupabase
      .from('prd_documents')
      .delete()
      .eq('id', prdId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting PRD:', error)
    return NextResponse.json(
      { error: 'Failed to delete PRD' },
      { status: 500 }
    )
  }
}
