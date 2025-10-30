import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createParamSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'select', 'multiselect', 'boolean']),
  help: z.string().optional(),
  options: z.object({
    options: z.array(z.string()).optional(),
  }).optional(),
  required: z.boolean().default(false),
  advanced: z.boolean().default(false),
  ordering: z.number().int().min(0).default(0),
})

const updateParamSchema = createParamSchema.partial()

// GET /api/admin/ai-platforms/[id]/params - List params for a platform
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('ai_platform_params')
      .select('*')
      .eq('platform_id', params.id)
      .order('ordering')

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

// POST /api/admin/ai-platforms/[id]/params - Create new param
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data, error } = await supabase
      .from('ai_platform_params')
      .insert([{
        platform_id: params.id,
        ...validation.data,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating platform param:', error)
    return NextResponse.json(
      { error: 'Failed to create platform param' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/ai-platforms/[id]/params?paramId=xxx - Update param
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramId = request.nextUrl.searchParams.get('paramId')
    if (!paramId) {
      return NextResponse.json({ error: 'Param ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validation = updateParamSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ai_platform_params')
      .update(validation.data)
      .eq('id', paramId)
      .eq('platform_id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating platform param:', error)
    return NextResponse.json(
      { error: 'Failed to update platform param' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/ai-platforms/[id]/params?paramId=xxx - Delete param
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramId = request.nextUrl.searchParams.get('paramId')
    if (!paramId) {
      return NextResponse.json({ error: 'Param ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ai_platform_params')
      .delete()
      .eq('id', paramId)
      .eq('platform_id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting platform param:', error)
    return NextResponse.json(
      { error: 'Failed to delete platform param' },
      { status: 500 }
    )
  }
}
