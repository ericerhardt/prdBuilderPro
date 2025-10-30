'use client'

import { useEffect, useState } from 'react'
import { TemplateParam } from '@/types/instruction'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2 } from 'lucide-react'

interface DynamicTemplateParamsFormProps {
  templateId: string
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
}

export function DynamicTemplateParamsForm({
  templateId,
  values,
  onChange,
}: DynamicTemplateParamsFormProps) {
  const [params, setParams] = useState<TemplateParam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (templateId) {
      fetchTemplateParams()
    } else {
      setParams([])
      setLoading(false)
    }
  }, [templateId])

  const fetchTemplateParams = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/instruction-templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()

      const template = data.find((t: any) => t.id === templateId)
      setParams(template?.params || [])
    } catch (error) {
      console.error('Error fetching template params:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    onChange({
      ...values,
      [key]: value,
    })
  }

  const renderParam = (param: TemplateParam) => {
    const value = values[param.key] || ''

    switch (param.type) {
      case 'text':
        return (
          <Input
            id={param.key}
            value={value}
            onChange={(e) => handleChange(param.key, e.target.value)}
            placeholder={param.help || ''}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={param.key}
            value={value}
            onChange={(e) => handleChange(param.key, e.target.value)}
            placeholder={param.help || ''}
            rows={4}
          />
        )

      case 'select':
        const selectOptions = param.options as { options: string[] } | null
        return (
          <Select value={value} onValueChange={(v) => handleChange(param.key, v)}>
            <SelectTrigger id={param.key}>
              <SelectValue placeholder={`Select ${param.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions?.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const multiOptions = param.options as { options: string[] } | null
        const selectedValues = value || []
        return (
          <div className="space-y-2">
            {multiOptions?.options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${param.key}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleChange(param.key, [...selectedValues, option])
                    } else {
                      handleChange(
                        param.key,
                        selectedValues.filter((v: string) => v !== option)
                      )
                    }
                  }}
                />
                <Label
                  htmlFor={`${param.key}-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={param.key}
              checked={value || false}
              onCheckedChange={(checked) => handleChange(param.key, checked)}
            />
            <Label htmlFor={param.key} className="text-sm font-normal cursor-pointer">
              {param.help || 'Enable'}
            </Label>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!params.length) {
    return null
  }

  const basicParams = params.filter((p) => !p.advanced)
  const advancedParams = params.filter((p) => p.advanced)

  return (
    <div className="space-y-6">
      {/* Basic Parameters */}
      {basicParams.map((param) => (
        <div key={param.id} className="space-y-2">
          <Label htmlFor={param.key}>
            {param.label}
            {param.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {renderParam(param)}
          {param.help && param.type !== 'textarea' && (
            <p className="text-sm text-muted-foreground">{param.help}</p>
          )}
        </div>
      ))}

      {/* Advanced Parameters */}
      {advancedParams.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced">
            <AccordionTrigger>Advanced Settings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4">
                {advancedParams.map((param) => (
                  <div key={param.id} className="space-y-2">
                    <Label htmlFor={param.key}>
                      {param.label}
                      {param.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderParam(param)}
                    {param.help && param.type !== 'textarea' && (
                      <p className="text-sm text-muted-foreground">{param.help}</p>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}
