import { PRDFormData } from '@/types/prd'

export function buildPRDPrompt(
  platform: string,
  platformLabel: string,
  formData: PRDFormData
): string {
  const { 
    productPitch, 
    targetUsers, 
    coreFeatures, 
    dataEntities, 
    designVibe,
    includeBilling,
    platformParams
  } = formData

  // Build platform-specific context
  let platformContext = ''
  
  switch (platform) {
    case 'replit':
      platformContext = `
Platform: Replit
- Backend: ${platformParams.backend || 'Node/Express'}
- Persistence: ${platformParams.persistence || 'Replit DB'}
- Deployment: ${platformParams.deployment || 'Replit hosting with Nix'}
- Template: ${platformParams.template || 'None specified'}

Replit-specific considerations:
- Use Replit's built-in package manager and Nix for dependencies
- Configure secrets via Replit Secrets tab
- Leverage Replit DB for simple key-value storage
- Include .replit and replit.nix configuration files
- Consider Always On for production deployments`
      break
      
    case 'bolt':
      platformContext = `
Platform: Bolt.new
- Framework: ${platformParams.codegen_target || 'Next.js'}
- Auth: ${platformParams.auth_source || 'Supabase'}
- Hosting: ${platformParams.hosting || 'Vercel'}

Bolt.new-specific considerations:
- Optimized for rapid prototyping with AI assistance
- Strong integration with Supabase for backend
- Vercel deployment configuration
- Environment variable management
- Edge function support`
      break
      
    case 'leap':
      const mcpConnectors = platformParams.mcp_connectors?.join(', ') || 'None'
      platformContext = `
Platform: Leap.new
- Model/Runtime: ${platformParams.model_runtime || 'Claude'}
- MCP Connectors: ${mcpConnectors}
- Tools & APIs: ${platformParams.tools_apis || 'Standard toolkit'}
- Guardrails: ${platformParams.guardrails || 'Default safety measures'}

Leap.new-specific considerations:
- Model Context Protocol (MCP) for rich integrations
- AI-first architecture with proper prompt engineering
- Rate limiting and token budget management
- Evaluation hooks for quality control
- Safety guardrails for responsible AI use`
      break
      
    case 'lovable':
      const integrations = platformParams.integrations?.join(', ') || 'None'
      platformContext = `
Platform: Lovable
- Project Type: ${platformParams.project_type || 'Web app'}
- Source Control: ${platformParams.source_control || 'GitHub integration'}
- Integrations: ${integrations}
- Collaboration: ${platformParams.collaboration || 'Standard PR flow'}

Lovable-specific considerations:
- Full-stack application support
- GitHub repository integration
- Built-in CI/CD pipeline
- Team collaboration features
- Deployment to production environments`
      break
  }

  const prompt = `You are an expert product manager and technical architect. Generate a comprehensive Product Requirements Document (PRD) for the following product, specifically tailored for building on ${platformLabel}.

PRODUCT INFORMATION:
- Pitch: ${productPitch}
- Target Users: ${targetUsers}
- Core Features: ${coreFeatures.join(', ')}
- Data Entities: ${dataEntities}
- Design Vibe: ${designVibe}
- Include Billing: ${includeBilling ? 'Yes - include comprehensive Stripe subscription blueprint' : 'No'}

${platformContext}

Generate a PRD with the following structure:

# {Product Name}

## One-liner
A single, compelling sentence that captures the essence of the product.

## Problem & Users
Expand on the problem space and target users with specific personas and use cases.

## User Flows
Detail the happy path and edge cases for 3-5 key user journeys.

## Features (MVP vs Later)
Organize features into:
- MVP (must-have for launch)
- v1.1 (nice-to-have soon after)
- Future (backlog items)

## Data Model
Provide detailed entity relationships, including:
- Tables/collections with fields
- Relationships between entities
- Indexes for performance
- Data validation rules

## Platform Implementation Notes (${platformLabel})
${platform === 'replit' ? 'Include file structure, .replit config, secrets management, and deployment steps.' : ''}
${platform === 'bolt' ? 'Include Next.js/Remix setup, Supabase schema, environment variables, and Vercel config.' : ''}
${platform === 'leap' ? 'Detail MCP connector configuration, prompt templates, tool definitions, and safety measures.' : ''}
${platform === 'lovable' ? 'Specify GitHub repo structure, CI/CD pipeline, deployment strategy, and team workflows.' : ''}

${includeBilling ? `## Billing with Stripe
Comprehensive Stripe integration blueprint:
- Subscription plans and pricing tiers
- Checkout flow implementation
- Customer portal setup
- Webhook handling (key events)
- Feature gating by plan
- Admin analytics dashboard
- Dunning and failed payment handling` : ''}

## Admin & Analytics
Define key metrics and admin capabilities:
- User management
- Content moderation
- Business metrics dashboard
- System health monitoring

## Non-Functional Requirements
- Performance targets (response times, concurrent users)
- Security requirements (authentication, authorization, data protection)
- Scalability considerations
- Compliance needs (GDPR, CCPA, etc.)
- Logging and monitoring

## Acceptance Criteria & Test Plan
- Key acceptance criteria for MVP
- Testing strategy (unit, integration, E2E)
- Performance benchmarks
- Security testing requirements

## Tasks for Claude Code
Provide a numbered list of specific, actionable tasks to implement this PRD:
1. Set up project structure with ${platformLabel} conventions
2. Implement authentication using ${platform === 'bolt' || platform === 'lovable' ? platformParams.auth_source || 'Supabase' : 'platform auth'}
3. Create data models and migrations
... (continue with 15-20 specific tasks)

Make the PRD comprehensive, specific to ${platformLabel}, and ready for a developer to start implementing immediately.`

  return prompt
}

export function extractProductName(bodyMarkdown: string): string {
  // Extract the first H1 heading as the product name
  const match = bodyMarkdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled PRD'
}
