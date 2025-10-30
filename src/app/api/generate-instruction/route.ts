import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildInstructionPrompt, extractInstructionTitle, generateFileName } from '@/lib/instruction/prompt-builder'
import { z } from 'zod'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const generateInstructionRequestSchema = z.object({
  platform: z.string(),
  template: z.string(),
  workspaceId: z.string().uuid(),
  formData: z.object({
    platformParams: z.record(z.any()),
    templateParams: z.record(z.any()),
    projectContext: z.string().optional(),
    additionalNotes: z.string().optional(),
    useCase: z.string().optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = generateInstructionRequestSchema.parse(body)

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
      .from('ai_platforms')
      .select('label')
      .eq('id', validatedData.platform)
      .single()

    if (platformError || !platform) {
      return Response.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('instruction_templates')
      .select('label, file_extension')
      .eq('id', validatedData.template)
      .single()

    if (templateError || !template) {
      return Response.json({ error: 'Invalid template' }, { status: 400 })
    }

    // Build the prompt
    const prompt = buildInstructionPrompt(
      validatedData.platform,
      platform.label,
      validatedData.template,
      template.label,
      validatedData.formData
    )

    // Call OpenAI API to generate the instruction
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI systems engineer who creates production-ready instruction files, prompts, and configurations for AI agents and systems. Generate clear, comprehensive, and immediately usable outputs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const generatedContent = completion.choices[0].message.content || ''

    // Extract title from the generated content
    const title = extractInstructionTitle(generatedContent, template.label)

    // Generate appropriate filename
    const fileName = generateFileName(
      validatedData.template,
      template.file_extension || '.md',
      title
    )

    // Save the instruction document to database
    const { data: instructionDoc, error: insertError } = await supabase
      .from('instruction_documents')
      .insert({
        workspace_id: validatedData.workspaceId,
        platform_id: validatedData.platform,
        template_id: validatedData.template,
        title: title,
        body_content: generatedContent,
        file_name: fileName,
        params: validatedData.formData,
        version: 1,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !instructionDoc) {
      console.error('Error saving instruction:', insertError)
      throw new Error('Failed to save instruction document')
    }

    // Create initial version record
    await supabase
      .from('instruction_versions')
      .insert({
        instruction_id: instructionDoc.id,
        version: 1,
        body_content: generatedContent,
        params: validatedData.formData,
      })

    return Response.json({
      id: instructionDoc.id,
      title: title,
      bodyContent: generatedContent,
      fileName: fileName,
    })

  } catch (error) {
    console.error('Error generating instruction:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to generate instruction' },
      { status: 500 }
    )
  }
}
