import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createPlatformSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/, 'ID must contain only lowercase letters, numbers, hyphens, and underscores'),
  label: z.string().min(1),
  ordering: z.number().int().min(0),
  enabled: z.boolean().default(true),
})

const updatePlatformSchema = z.object({
  label: z.string().min(1).optional(),
  ordering: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
})

// GET /api/admin/platforms - List all platforms with params
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can access

    const { data: platforms, error: platformsError } = await supabase
      .from('platforms')
      .select('*')
      .order('ordering')

    if (platformsError) throw platformsError

    const { data: params, error: paramsError } = await supabase
      .from('platform_params')
      .select('*')
      .order('id')

    if (paramsError) throw paramsError

    // Combine platforms with their params
    const platformsWithParams = platforms.map((platform: any) => ({
      ...platform,
      params: params.filter((param: any) => param.platform_id === platform.id),
    }))

    return NextResponse.json(platformsWithParams)
  } catch (error) {
    console.error('Error fetching platforms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    )
  }
}

// POST /api/admin/platforms - Create new platform
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here

    const body = await request.json()
    const validation = createPlatformSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('platforms')
      .insert([validation.data])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Platform ID already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating platform:', error)
    return NextResponse.json(
      { error: 'Failed to create platform' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/platforms?id=xxx - Update platform
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here

    const platformId = request.nextUrl.searchParams.get('id')
    if (!platformId) {
      return NextResponse.json({ error: 'Platform ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validation = updatePlatformSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('platforms')
      .update(validation.data)
      .eq('id', platformId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating platform:', error)
    return NextResponse.json(
      { error: 'Failed to update platform' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/platforms?id=xxx - Delete platform
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here

    const platformId = request.nextUrl.searchParams.get('id')
    if (!platformId) {
      return NextResponse.json({ error: 'Platform ID required' }, { status: 400 })
    }

    // Check if there are any PRD documents using this platform
    const { data: prds, error: prdError } = await supabase
      .from('prd_documents')
      .select('id')
      .eq('platform', platformId)
      .limit(1)

    if (prdError) throw prdError

    if (prds && prds.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete platform with existing PRD documents' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('platforms')
      .delete()
      .eq('id', platformId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting platform:', error)
    return NextResponse.json(
      { error: 'Failed to delete platform' },
      { status: 500 }
    )
  }
}
