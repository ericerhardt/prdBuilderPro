import { InstructionFormData } from '@/types/instruction'

export function buildInstructionPrompt(
  platformId: string,
  platformLabel: string,
  templateId: string,
  templateLabel: string,
  formData: InstructionFormData
): string {
  const { platformParams, templateParams, projectContext, additionalNotes, useCase } = formData

  // Build platform-specific context
  const platformContext = buildPlatformContext(platformId, platformParams)

  // Build template-specific instructions
  const templateInstructions = buildTemplateInstructions(templateId, templateParams)

  const prompt = `You are an expert AI systems engineer specializing in creating high-quality instruction files for AI agents and systems. Generate a comprehensive ${templateLabel} for the ${platformLabel} platform.

PLATFORM INFORMATION:
${platformContext}

TEMPLATE TYPE: ${templateLabel}
${templateInstructions}

${projectContext ? `PROJECT CONTEXT:
${projectContext}` : ''}

${useCase ? `USE CASE:
${useCase}` : ''}

${additionalNotes ? `ADDITIONAL REQUIREMENTS:
${additionalNotes}` : ''}

Generate the ${templateLabel} following these principles:
1. Make it specific, actionable, and production-ready
2. Follow ${platformLabel} conventions and best practices
3. Include clear examples where appropriate
4. Be comprehensive but concise
5. Use proper formatting for the target platform
6. Include relevant metadata and configuration

The output should be ready to use immediately in a ${platformLabel} environment without requiring additional editing.`

  return prompt
}

function buildPlatformContext(platformId: string, params: Record<string, any>): string {
  switch (platformId) {
    case 'claude-code':
      return `
Platform: Claude Code (Anthropic)
- Model: ${params.model || 'sonnet'}
- MCP Servers: ${Array.isArray(params.mcp_servers) ? params.mcp_servers.join(', ') : 'None'}
- Available Tools: ${Array.isArray(params.tools) ? params.tools.join(', ') : 'Standard toolkit'}
- Special Capabilities: ${params.capabilities || 'General purpose'}

Claude Code-specific considerations:
- Uses markdown for system prompts and instructions
- Supports Model Context Protocol (MCP) for integrations
- Can create sub-agents via the Task tool
- Slash commands are defined in .claude/commands/
- CLAUDE.md provides project-wide context
- Supports skills as reusable capabilities`

    case 'cursor':
      return `
Platform: Cursor AI
- Mode: ${params.mode || 'Composer'}
- Rules Type: ${params.rules_type || '.cursorrules'}
- Context Sources: ${Array.isArray(params.context_sources) ? params.context_sources.join(', ') : 'Codebase'}

Cursor-specific considerations:
- Uses .cursorrules file for project instructions
- Composer mode for multi-file editing
- Chat mode for Q&A and guidance
- Inline editing for quick fixes
- Can reference docs and web context
- Supports @-mentions for context inclusion`

    case 'aider':
      return `
Platform: Aider
- Model: ${params.model_type || 'gpt-4'}
- Edit Format: ${params.edit_format || 'whole'}
- Features: ${Array.isArray(params.features) ? params.features.join(', ') : 'Standard'}

Aider-specific considerations:
- Terminal-based AI pair programming
- Git-aware with auto-commits
- Configuration via .aider.conf.yml
- Supports multiple edit formats (whole, diff, udiff)
- Can run tests automatically
- Voice input support available`

    case 'github-copilot':
      return `
Platform: GitHub Copilot
- Context: ${Array.isArray(params.context_sources) ? params.context_sources.join(', ') : 'Code context'}

GitHub Copilot-specific considerations:
- Instructions via .github/copilot-instructions.md
- Code completion and suggestions
- Chat for explanations and refactoring
- Slash commands for common tasks
- Works within IDE (VS Code, JetBrains, etc.)
- Limited to completion and chat modes`

    case 'windsurf':
      return `
Platform: Windsurf (Codeium)
- Cascade Mode: ${params.cascade_mode || 'Enabled'}
- Features: ${Array.isArray(params.features) ? params.features.join(', ') : 'Standard'}

Windsurf-specific considerations:
- Cascade for agentic multi-step tasks
- Flows for complex workflows
- Context-aware code generation
- Multi-file editing capabilities
- Supercomplete for advanced suggestions
- Integrated terminal and debugging`

    case 'custom':
      return `
Platform: Custom/Other
- Configuration: ${params.config || 'User-defined'}
- Capabilities: ${params.capabilities || 'General purpose'}

Custom platform considerations:
- Generate generic, portable instructions
- Focus on clear, implementation-agnostic guidance
- Include setup and configuration notes
- Provide examples for common scenarios`

    default:
      return `Platform: ${platformId}
Configuration: ${JSON.stringify(params, null, 2)}`
  }
}

function buildTemplateInstructions(templateId: string, params: Record<string, any>): string {
  switch (templateId) {
    case 'system-prompt':
      return `
Generate a comprehensive system prompt with:
- Purpose: ${params.purpose || 'Not specified'}
- Expertise Areas: ${params.expertise || 'General'}
- Constraints: ${params.constraints || 'Standard safety guidelines'}
- Tone & Style: ${params.tone || 'Professional'}
- Output Format: ${params.output_format || 'Markdown'}

The system prompt should define:
1. Core identity and purpose
2. Domain expertise and knowledge areas
3. Behavioral guidelines and constraints
4. Communication style and tone
5. Output formatting preferences
6. Error handling approach
7. Examples of expected behavior`

    case 'sub-agent':
      return `
Generate a specialized sub-agent definition with:
- Agent Name: ${params.agent_name || 'Unnamed Agent'}
- Specialization: ${params.specialization || 'General purpose'}
- Required Tools: ${Array.isArray(params.tools_needed) ? params.tools_needed.join(', ') : 'Standard'}
- Trigger Condition: ${params.trigger_condition || 'Manual invocation'}
- Success Criteria: ${params.success_criteria || 'Task completion'}

The sub-agent should include:
1. Clear specialization and scope
2. When and how to invoke it
3. Required tools and permissions
4. Input/output specifications
5. Success/failure criteria
6. Example use cases
7. Integration with parent agent`

    case 'skill':
      return `
Generate a reusable skill definition with:
- Skill Name: ${params.skill_name || 'Unnamed Skill'}
- Description: ${params.description || 'Not specified'}
- Input Schema: ${params.input_schema || 'Flexible'}
- Output Schema: ${params.output_schema || 'Flexible'}
- Implementation Notes: ${params.implementation || 'Standard'}

The skill should define:
1. Purpose and capabilities
2. Input parameters (JSON schema)
3. Output format (JSON schema)
4. Error handling
5. Usage examples
6. Dependencies and requirements
7. Performance considerations`

    case 'mcp-connector':
      return `
Generate an MCP connector configuration with:
- Connector Name: ${params.connector_name || 'Unnamed Connector'}
- Service Type: ${params.service_type || 'Generic'}
- Capabilities: ${Array.isArray(params.capabilities) ? params.capabilities.join(', ') : 'Read-only'}
- Authentication: ${params.auth_method || 'API Key'}
- Configuration: ${params.config_details || 'Standard'}

The MCP connector should include:
1. Server configuration (JSON)
2. Available tools/resources
3. Authentication setup
4. Connection parameters
5. Error handling
6. Usage examples
7. Security considerations`

    case 'slash-command':
      return `
Generate a slash command definition with:
- Command Name: ${params.command_name || '/unnamed'}
- Description: ${params.description || 'Not specified'}
- Arguments: ${params.arguments || 'None'}
- Workflow: ${params.workflow || 'Not specified'}
- Examples: ${params.examples || 'Not provided'}

The slash command should define:
1. Command syntax and arguments
2. Purpose and use cases
3. Step-by-step workflow
4. Expected outputs
5. Error handling
6. Usage examples
7. Best practices`

    case 'workflow':
      return `
Generate a multi-step workflow definition with:
- Workflow Purpose: ${params.purpose || 'Not specified'}
- Steps: ${params.steps || 'To be defined'}
- Triggers: ${params.triggers || 'Manual'}
- Dependencies: ${params.dependencies || 'None'}

The workflow should include:
1. Trigger conditions
2. Sequential steps with clear inputs/outputs
3. Decision points and branching
4. Error handling and recovery
5. Success criteria
6. Example execution
7. YAML/JSON configuration`

    case 'context-file':
      return `
Generate a project context file with:
- Project Type: ${params.project_type || 'Not specified'}
- Tech Stack: ${params.tech_stack || 'Not specified'}
- Coding Standards: ${params.coding_standards || 'Industry standard'}
- Architecture: ${params.architecture || 'Not specified'}
- Common Gotchas: ${params.gotchas || 'None noted'}

The context file should include:
1. Project overview and purpose
2. Technology stack details
3. Architecture and patterns
4. Coding conventions
5. File structure organization
6. Common gotchas and pitfalls
7. Development workflow
8. Testing approach
9. Deployment considerations`

    default:
      return `Template: ${templateId}
Parameters: ${JSON.stringify(params, null, 2)}`
  }
}

export function extractInstructionTitle(bodyContent: string, templateLabel: string): string {
  // Try to extract from first heading
  const h1Match = bodyContent.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()

  // Try to extract from title field in JSON
  try {
    const json = JSON.parse(bodyContent)
    if (json.title || json.name) return json.title || json.name
  } catch {
    // Not JSON, continue
  }

  // Try to extract from YAML frontmatter
  const yamlMatch = bodyContent.match(/^---\s*\ntitle:\s*(.+)\n/m)
  if (yamlMatch) return yamlMatch[1].trim()

  // Default fallback
  return `Untitled ${templateLabel}`
}

export function generateFileName(
  templateId: string,
  fileExtension: string,
  title: string
): string {
  // Sanitize title for filename
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  // Generate appropriate filename based on template
  switch (templateId) {
    case 'context-file':
      return 'CLAUDE.md' // or .cursorrules, etc.
    case 'slash-command':
      return `${sanitized}${fileExtension}`
    case 'mcp-connector':
      return `${sanitized}-server${fileExtension}`
    case 'skill':
      return `${sanitized}-skill${fileExtension}`
    case 'sub-agent':
      return `${sanitized}-agent${fileExtension}`
    default:
      return `${sanitized}${fileExtension}`
  }
}
