import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/instruction-templates - List all instruction templates with params
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: templates, error: templatesError } = await supabase
      .from('instruction_templates')
      .select('*')
      .eq('enabled', true)
      .order('ordering')

    if (templatesError) throw templatesError

    const { data: params, error: paramsError } = await supabase
      .from('template_params')
      .select('*')
      .order('ordering')

    if (paramsError) throw paramsError

    // Combine templates with their params
    const templatesWithParams = templates.map((template: any) => ({
      ...template,
      params: params.filter((param: any) => param.template_id === template.id),
    }))

    return NextResponse.json(templatesWithParams)
  } catch (error) {
    console.error('Error fetching instruction templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch instruction templates' },
      { status: 500 }
    )
  }
}
