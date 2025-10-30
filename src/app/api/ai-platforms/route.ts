import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/ai-platforms - List all enabled AI platforms with params (public endpoint for users)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: platforms, error: platformsError } = await supabase
      .from('ai_platforms')
      .select('*')
      .eq('enabled', true)
      .order('ordering')

    if (platformsError) throw platformsError

    const { data: params, error: paramsError } = await supabase
      .from('ai_platform_params')
      .select('*')
      .order('ordering')

    if (paramsError) throw paramsError

    // Combine platforms with their params
    const platformsWithParams = platforms.map((platform: any) => ({
      ...platform,
      params: params.filter((param: any) => param.platform_id === platform.id),
    }))

    return NextResponse.json(platformsWithParams)
  } catch (error) {
    console.error('Error fetching AI platforms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI platforms' },
      { status: 500 }
    )
  }
}
