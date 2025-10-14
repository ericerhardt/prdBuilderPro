'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { useState } from 'react'

interface CoreInputsProps {
  values: {
    productPitch: string
    targetUsers: string
    coreFeatures: string[]
    dataEntities: string
    designVibe: 'minimal' | 'dashboard' | 'marketplace' | 'playful' | 'professional'
    includeBilling: boolean
  }
  onChange: (values: any) => void
}

export function CoreInputs({ values, onChange }: CoreInputsProps) {
  const [featureInput, setFeatureInput] = useState('')

  const handleAddFeature = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && featureInput.trim()) {
      e.preventDefault()
      onChange({
        ...values,
        coreFeatures: [...values.coreFeatures, featureInput.trim()]
      })
      setFeatureInput('')
    }
  }

  const handleRemoveFeature = (index: number) => {
    onChange({
      ...values,
      coreFeatures: values.coreFeatures.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="space-y-6">
      {/* Product Pitch */}
      <div className="space-y-2">
        <Label htmlFor="productPitch">
          Product Pitch <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="productPitch"
          value={values.productPitch}
          onChange={(e) => onChange({ ...values, productPitch: e.target.value })}
          placeholder="Describe your product in 1-2 sentences..."
          rows={2}
        />
        <p className="text-sm text-muted-foreground">
          A concise description that captures the essence of your product
        </p>
      </div>

      {/* Target Users */}
      <div className="space-y-2">
        <Label htmlFor="targetUsers">
          Target Users & Jobs-to-be-done <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="targetUsers"
          value={values.targetUsers}
          onChange={(e) => onChange({ ...values, targetUsers: e.target.value })}
          placeholder="Who are your users and what are they trying to accomplish?"
          rows={3}
        />
      </div>

      {/* Core Features */}
      <div className="space-y-2">
        <Label htmlFor="features">
          Core Features <span className="text-destructive">*</span>
        </Label>
        <div className="space-y-2">
          <Input
            id="features"
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            onKeyDown={handleAddFeature}
            placeholder="Type a feature and press Enter..."
          />
          {values.coreFeatures.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {values.coreFeatures.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          List the main features and capabilities
        </p>
      </div>

      {/* Data Entities */}
      <div className="space-y-2">
        <Label htmlFor="dataEntities">
          Data Entities <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="dataEntities"
          value={values.dataEntities}
          onChange={(e) => onChange({ ...values, dataEntities: e.target.value })}
          placeholder="Describe the main data entities and their relationships..."
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          What data will your app need to store and manage?
        </p>
      </div>

      {/* Design Vibe */}
      <div className="space-y-2">
        <Label htmlFor="designVibe">Design Vibe</Label>
        <Select
          value={values.designVibe}
          onValueChange={(v: any) => onChange({ ...values, designVibe: v })}
        >
          <SelectTrigger id="designVibe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="dashboard">Dashboard</SelectItem>
            <SelectItem value="marketplace">Marketplace</SelectItem>
            <SelectItem value="playful">Playful</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Include Billing */}
      <div className="flex items-center space-x-2">
        <Switch
          id="billing"
          checked={values.includeBilling}
          onCheckedChange={(checked) => onChange({ ...values, includeBilling: checked })}
        />
        <Label htmlFor="billing" className="cursor-pointer">
          Include Stripe subscription blueprint
        </Label>
      </div>
    </div>
  )
}
