import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createParamSchema = z.object({
  platform_id: z.string().min(1),
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Key must contain only lowercase letters, numbers, and underscores'),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'select', 'multiselect', 'boolean']),
  help: z.string().optional().nullable(),
  options: z.any().optional().nullable(), // JSONB field
  required: z.boolean().default(false),
  advanced: z.boolean().default(false),
})

const updateParamSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/).optional(),
  label: z.string().min(1).optional(),
  type: z.enum(['text', 'textarea', 'select', 'multiselect', 'boolean']).optional(),
  help: z.string().optional().nullable(),
  options: z.any().optional().nullable(),
  required: z.boolean().optional(),
  advanced: z.boolean().optional(),
})

// GET /api/admin/platforms/params?platform_id=xxx - List params for a platform
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platformId = request.nextUrl.searchParams.get('platform_id')

    let query = supabase.from('platform_params').select('*').order('id')

    if (platformId) {
      query = query.eq('platform_id', platformId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching platform params:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform params' },
      { status: 500 }
    )
  }
}

// POST /api/admin/platforms/params - Create new parameter
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createParamSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Validate that the platform exists
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id')
      .eq('id', validation.data.platform_id)
      .single()

    if (platformError || !platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      )
    }

    // Validate options for select/multiselect types
    if (['select', 'multiselect'].includes(validation.data.type)) {
      if (!validation.data.options || !validation.data.options.options || !Array.isArray(validation.data.options.options)) {
        return NextResponse.json(
          { error: 'Select and multiselect types require options field with an options array' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('platform_params')
      .insert([validation.data])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating platform param:', error)
    return NextResponse.json(
      { error: 'Failed to create platform parameter' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/platforms/params?id=xxx - Update parameter
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramId = request.nextUrl.searchParams.get('id')
    if (!paramId) {
      return NextResponse.json({ error: 'Parameter ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validation = updateParamSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Validate options for select/multiselect types
    if (validation.data.type && ['select', 'multiselect'].includes(validation.data.type)) {
      if (validation.data.options && (!validation.data.options.options || !Array.isArray(validation.data.options.options))) {
        return NextResponse.json(
          { error: 'Select and multiselect types require options field with an options array' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('platform_params')
      .update(validation.data)
      .eq('id', paramId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating platform param:', error)
    return NextResponse.json(
      { error: 'Failed to update platform parameter' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/platforms/params?id=xxx - Delete parameter
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramId = request.nextUrl.searchParams.get('id')
    if (!paramId) {
      return NextResponse.json({ error: 'Parameter ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('platform_params')
      .delete()
      .eq('id', paramId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting platform param:', error)
    return NextResponse.json(
      { error: 'Failed to delete platform parameter' },
      { status: 500 }
    )
  }
}
