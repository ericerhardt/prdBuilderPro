import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/admin/diagnostics - Check if AI Instruction Builder tables exist
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const diagnostics: any = {
      authenticated: true,
      userId: user.id,
      timestamp: new Date().toISOString(),
      tables: {},
      counts: {},
      errors: [],
    }

    // Check if tables exist by trying to query them
    const tablesToCheck = [
      'ai_platforms',
      'ai_platform_params',
      'instruction_templates',
      'template_params',
      'instruction_documents',
      'instruction_versions',
      'platform_template_compatibility',
    ]

    for (const tableName of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          diagnostics.tables[tableName] = 'ERROR'
          diagnostics.errors.push({
            table: tableName,
            error: error.message,
            code: error.code,
          })
        } else {
          diagnostics.tables[tableName] = 'EXISTS'
          diagnostics.counts[tableName] = count || 0
        }
      } catch (err: any) {
        diagnostics.tables[tableName] = 'ERROR'
        diagnostics.errors.push({
          table: tableName,
          error: err.message,
        })
      }
    }

    // Check for sample data
    try {
      const { data: platforms } = await supabase
        .from('ai_platforms')
        .select('id, label')
        .limit(3)

      diagnostics.samplePlatforms = platforms || []
    } catch (err) {
      // Table might not exist
    }

    return NextResponse.json(diagnostics)
  } catch (error: any) {
    console.error('Error in diagnostics:', error)
    return NextResponse.json(
      {
        error: 'Diagnostics failed',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
