import { Database } from './database'

export type Platform = Database['public']['Tables']['platforms']['Row']
export type PlatformParam = Database['public']['Tables']['platform_params']['Row']
export type PRDDocument = Database['public']['Tables']['prd_documents']['Row']
export type PRDVersion = Database['public']['Tables']['prd_versions']['Row']
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']

export interface PRDFormData {
  // Core inputs
  productPitch: string
  targetUsers: string
  coreFeatures: string[]
  dataEntities: string
  designVibe: 'minimal' | 'dashboard' | 'marketplace' | 'playful' | 'professional'
  includeBilling: boolean
  
  // Platform-specific params (dynamic)
  platformParams: Record<string, any>
}

export interface PRDSection {
  id: string
  title: string
  content: string
  order: number
}

export interface GeneratePRDRequest {
  platform: string
  formData: PRDFormData
}

export interface GeneratePRDResponse {
  id: string
  title: string
  bodyMarkdown: string
}

export interface PricingPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
}

export interface BillingMetrics {
  mrrCents: number
  activeSubscribers: number
  trials: number
  churnRate: number
  arpaCents: number
  newSubs: number
  cancels: number
}
