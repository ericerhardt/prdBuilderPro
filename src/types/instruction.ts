// Types for AI Instruction Builder feature

export interface AIPlatform {
  id: string
  label: string
  description: string | null
  ordering: number
  enabled: boolean
  icon: string | null
  created_at: string
  updated_at: string
}

export interface InstructionTemplate {
  id: string
  label: string
  description: string | null
  file_extension: string | null
  enabled: boolean
  ordering: number
  created_at: string
}

export interface AIPlatformParam {
  id: number
  platform_id: string
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean'
  help: string | null
  options: {
    options?: string[]
  } | null
  required: boolean
  advanced: boolean
  ordering: number
}

export interface TemplateParam {
  id: number
  template_id: string
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean'
  help: string | null
  options: {
    options?: string[]
  } | null
  required: boolean
  advanced: boolean
  ordering: number
}

export interface PlatformTemplateCompatibility {
  platform_id: string
  template_id: string
  recommended: boolean
  notes: string | null
}

export interface InstructionDocument {
  id: string
  workspace_id: string
  platform_id: string
  template_id: string
  title: string
  body_content: string
  file_name: string | null
  params: InstructionFormData
  version: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface InstructionVersion {
  instruction_id: string
  version: number
  body_content: string
  params: InstructionFormData
  created_at: string
}

// Form data structure for instruction generation
export interface InstructionFormData {
  // Platform parameters (dynamic based on selected platform)
  platformParams: Record<string, any>

  // Template parameters (dynamic based on selected template)
  templateParams: Record<string, any>

  // Common fields
  projectContext?: string
  additionalNotes?: string
  useCase?: string
}

// API request/response types
export interface GenerateInstructionRequest {
  platform: string
  template: string
  workspaceId: string
  formData: InstructionFormData
}

export interface GenerateInstructionResponse {
  id: string
  title: string
  bodyContent: string
  fileName: string
}

// Extended types with relations
export interface AIPlatformWithParams extends AIPlatform {
  params: AIPlatformParam[]
}

export interface InstructionTemplateWithParams extends InstructionTemplate {
  params: TemplateParam[]
}

export interface InstructionDocumentWithDetails extends InstructionDocument {
  platform: AIPlatform
  template: InstructionTemplate
  versions?: InstructionVersion[]
}
