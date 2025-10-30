'use client'

import { useState, useEffect } from 'react'
import { PlatformParam } from '@/types/prd'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, X } from 'lucide-react'

interface PlatformParamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformId: string
  param?: PlatformParam | null
  onSuccess: () => void
}

export function PlatformParamDialog({
  open,
  onOpenChange,
  platformId,
  param,
  onSuccess,
}: PlatformParamDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    type: 'text' as 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean',
    help: '',
    options: [] as string[],
    required: false,
    advanced: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    if (param) {
      const options = param.options as { options?: string[] } | null
      setFormData({
        key: param.key,
        label: param.label,
        type: param.type as any,
        help: param.help || '',
        options: options?.options || [],
        required: param.required,
        advanced: param.advanced,
      })
    } else {
      setFormData({
        key: '',
        label: '',
        type: 'text',
        help: '',
        options: [],
        required: false,
        advanced: false,
      })
    }
    setErrors({})
    setNewOption('')
  }, [param, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.key.trim()) {
      newErrors.key = 'Parameter key is required'
    } else if (!/^[a-z0-9_]+$/.test(formData.key)) {
      newErrors.key = 'Key must contain only lowercase letters, numbers, and underscores'
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Parameter label is required'
    }

    if (['select', 'multiselect'].includes(formData.type) && formData.options.length === 0) {
      newErrors.options = 'At least one option is required for select/multiselect types'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      })
      setNewOption('')
    }
  }

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const isEdit = !!param
      const url = isEdit
        ? `/api/admin/platforms/params?id=${param.id}`
        : '/api/admin/platforms/params'
      const method = isEdit ? 'PATCH' : 'POST'

      const body: any = {
        key: formData.key,
        label: formData.label,
        type: formData.type,
        help: formData.help || null,
        required: formData.required,
        advanced: formData.advanced,
      }

      // Only include platform_id for new params
      if (!isEdit) {
        body.platform_id = platformId
      }

      // Format options for select/multiselect types
      if (['select', 'multiselect'].includes(formData.type)) {
        body.options = { options: formData.options }
      } else {
        body.options = null
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save parameter')
      }

      toast({
        title: 'Success',
        description: `Parameter ${isEdit ? 'updated' : 'created'} successfully`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving parameter:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save parameter',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{param ? 'Edit Parameter' : 'Add New Parameter'}</DialogTitle>
          <DialogDescription>
            {param
              ? 'Update the parameter details below.'
              : 'Add a new parameter to collect platform-specific information from users.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">
                Parameter Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase() })}
                placeholder="e.g., backend, framework, deployment"
                disabled={!!param || loading}
              />
              {errors.key && <p className="text-sm text-destructive">{errors.key}</p>}
              {!param && (
                <p className="text-xs text-muted-foreground">
                  Used in code and API. Lowercase letters, numbers, and underscores only.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Backend Framework, Deployment Configuration"
                disabled={loading}
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label}</p>}
              <p className="text-xs text-muted-foreground">Display name shown to users</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Input Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value, options: [] })}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text (single line)</SelectItem>
                  <SelectItem value="textarea">Text Area (multi-line)</SelectItem>
                  <SelectItem value="select">Select (dropdown)</SelectItem>
                  <SelectItem value="multiselect">Multi-Select (checkboxes)</SelectItem>
                  <SelectItem value="boolean">Boolean (toggle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['select', 'multiselect'].includes(formData.type) && (
              <div className="space-y-2">
                <Label>
                  Options <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={option} disabled className="flex-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add an option"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddOption()
                        }
                      }}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddOption}
                      disabled={loading || !newOption.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {errors.options && <p className="text-sm text-destructive">{errors.options}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="help">Help Text</Label>
              <Textarea
                id="help"
                value={formData.help}
                onChange={(e) => setFormData({ ...formData, help: e.target.value })}
                placeholder="Provide guidance to users about this parameter"
                rows={3}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Optional description or instructions for users
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                disabled={loading}
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required field
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="advanced"
                checked={formData.advanced}
                onCheckedChange={(checked) => setFormData({ ...formData, advanced: checked })}
                disabled={loading}
              />
              <Label htmlFor="advanced" className="cursor-pointer">
                Advanced setting (hidden in accordion)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {param ? 'Update' : 'Create'} Parameter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
