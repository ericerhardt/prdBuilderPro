import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/platform-compatibility?platform=xxx - Get compatible templates for a platform
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platformId = request.nextUrl.searchParams.get('platform')

    if (!platformId) {
      return NextResponse.json(
        { error: 'Platform ID required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('platform_template_compatibility')
      .select(`
        *,
        template:instruction_templates(*)
      `)
      .eq('platform_id', platformId)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching platform compatibility:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform compatibility' },
      { status: 500 }
    )
  }
}
