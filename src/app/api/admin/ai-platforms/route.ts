import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createAIPlatformSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/, 'ID must contain only lowercase letters, numbers, hyphens, and underscores'),
  label: z.string().min(1),
  description: z.string().optional(),
  ordering: z.number().int().min(0),
  enabled: z.boolean().default(true),
  icon: z.string().optional(),
})

const updateAIPlatformSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  ordering: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
  icon: z.string().optional(),
})

// GET /api/admin/ai-platforms - List all AI platforms with params
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
      .from('ai_platforms')
      .select('*')
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

// POST /api/admin/ai-platforms - Create new AI platform
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check here

    const body = await request.json()
    const validation = createAIPlatformSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ai_platforms')
      .insert([validation.data])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'AI Platform ID already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating AI platform:', error)
    return NextResponse.json(
      { error: 'Failed to create AI platform' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/ai-platforms?id=xxx - Update AI platform
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
    const validation = updateAIPlatformSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ai_platforms')
      .update(validation.data)
      .eq('id', platformId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating AI platform:', error)
    return NextResponse.json(
      { error: 'Failed to update AI platform' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/ai-platforms?id=xxx - Delete AI platform
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

    // Check if there are any instruction documents using this platform
    const { data: instructions, error: instructionError } = await supabase
      .from('instruction_documents')
      .select('id')
      .eq('platform_id', platformId)
      .limit(1)

    if (instructionError) throw instructionError

    if (instructions && instructions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete AI platform with existing instruction documents' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('ai_platforms')
      .delete()
      .eq('id', platformId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI platform:', error)
    return NextResponse.json(
      { error: 'Failed to delete AI platform' },
      { status: 500 }
    )
  }
}
