import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPRDPrompt, extractProductName } from '@/lib/prd/prompt-builder'
import { z } from 'zod'

const generateRequestSchema = z.object({
  platform: z.string(),
  workspaceId: z.string().uuid(),
  formData: z.object({
    productPitch: z.string().min(1),
    targetUsers: z.string().min(1),
    coreFeatures: z.array(z.string()).min(1),
    dataEntities: z.string().min(1),
    designVibe: z.enum(['minimal', 'dashboard', 'marketplace', 'playful', 'professional']),
    includeBilling: z.boolean(),
    platformParams: z.record(z.any()),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = generateRequestSchema.parse(body)
    
    // Verify user has access to the workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', validatedData.workspaceId)
      .eq('user_id', user.id)
      .single()
    
    if (memberError || !member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get platform details
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('label')
      .eq('id', validatedData.platform)
      .single()
    
    if (platformError || !platform) {
      return Response.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Build the prompt
    const prompt = buildPRDPrompt(
      validatedData.platform,
      platform.label,
      validatedData.formData
    )

    // Call OpenAI API to generate the PRD
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert product manager and technical architect. Generate comprehensive, actionable PRDs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error('Failed to generate PRD')
    }

    const openaiData = await openaiResponse.json()
    const generatedContent = openaiData.choices[0].message.content

    // Extract product name from the generated content
    const productName = extractProductName(generatedContent)

    // Save the PRD to database
    const { data: prdDoc, error: insertError } = await supabase
      .from('prd_documents')
      .insert({
        workspace_id: validatedData.workspaceId,
        platform: validatedData.platform,
        title: productName,
        body_markdown: generatedContent,
        params: validatedData.formData,
        version: 1,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !prdDoc) {
      throw new Error('Failed to save PRD')
    }

    // Create initial version record
    await supabase
      .from('prd_versions')
      .insert({
        prd_id: prdDoc.id,
        version: 1,
        body_markdown: generatedContent,
        params: validatedData.formData,
      })

    return Response.json({
      id: prdDoc.id,
      title: productName,
      bodyMarkdown: generatedContent,
    })

  } catch (error) {
    console.error('Error generating PRD:', error)
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return Response.json(
      { error: 'Failed to generate PRD' },
      { status: 500 }
    )
  }
}
