'use client'

import { useEffect, useState } from 'react'
import { InstructionTemplate, PlatformTemplateCompatibility } from '@/types/instruction'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Star } from 'lucide-react'

interface TemplateSelectorProps {
  platformId: string
  value: string
  onChange: (value: string) => void
}

export function TemplateSelector({ platformId, value, onChange }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([])
  const [compatibility, setCompatibility] = useState<PlatformTemplateCompatibility[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (platformId) {
      fetchCompatibility()
    }
  }, [platformId])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/instruction-templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompatibility = async () => {
    if (!platformId) return
    try {
      const response = await fetch(`/api/platform-compatibility?platform=${platformId}`)
      if (!response.ok) throw new Error('Failed to fetch compatibility')
      const data = await response.json()
      setCompatibility(data || [])
    } catch (error) {
      console.error('Error fetching compatibility:', error)
    }
  }

  const isRecommended = (templateId: string): boolean => {
    return compatibility.some(
      c => c.template_id === templateId && c.recommended
    )
  }

  const isCompatible = (templateId: string): boolean => {
    return compatibility.some(c => c.template_id === templateId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  // Filter templates based on compatibility if platform is selected
  const displayTemplates = platformId
    ? templates.filter(t => isCompatible(t.id))
    : templates

  return (
    <div className="space-y-2">
      <Label htmlFor="template">Instruction Type</Label>
      <Select value={value} onValueChange={onChange} disabled={!platformId}>
        <SelectTrigger id="template">
          <SelectValue placeholder={platformId ? "Select instruction type" : "Select a platform first"} />
        </SelectTrigger>
        <SelectContent>
          {displayTemplates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <span>{template.label}</span>
                {isRecommended(template.id) && (
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && templates.find(t => t.id === value) && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {templates.find(t => t.id === value)?.description}
          </p>
          {isRecommended(value) && (
            <Badge variant="secondary" className="text-xs">
              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
              Recommended for this platform
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
