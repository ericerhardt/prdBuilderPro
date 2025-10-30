'use client'

import { useState, useEffect } from 'react'
import { Platform } from '@/types/prd'
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface PlatformDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform?: Platform | null
  onSuccess: () => void
}

export function PlatformDialog({
  open,
  onOpenChange,
  platform,
  onSuccess,
}: PlatformDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    label: '',
    ordering: 0,
    enabled: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (platform) {
      setFormData({
        id: platform.id,
        label: platform.label,
        ordering: platform.ordering,
        enabled: platform.enabled,
      })
    } else {
      // Reset form for new platform
      setFormData({
        id: '',
        label: '',
        ordering: 0,
        enabled: true,
      })
    }
    setErrors({})
  }, [platform, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.id.trim()) {
      newErrors.id = 'Platform ID is required'
    } else if (!/^[a-z0-9_-]+$/.test(formData.id)) {
      newErrors.id = 'ID must contain only lowercase letters, numbers, hyphens, and underscores'
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Platform label is required'
    }

    if (formData.ordering < 0) {
      newErrors.ordering = 'Ordering must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const isEdit = !!platform
      const url = isEdit
        ? `/api/admin/platforms?id=${platform.id}`
        : '/api/admin/platforms'
      const method = isEdit ? 'PATCH' : 'POST'

      const body = isEdit
        ? { label: formData.label, ordering: formData.ordering, enabled: formData.enabled }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save platform')
      }

      toast({
        title: 'Success',
        description: `Platform ${isEdit ? 'updated' : 'created'} successfully`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving platform:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save platform',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{platform ? 'Edit Platform' : 'Add New Platform'}</DialogTitle>
          <DialogDescription>
            {platform
              ? 'Update the platform details below.'
              : 'Add a new platform to generate PRDs for. This will appear in the platform selector.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="id">
                Platform ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase() })}
                placeholder="e.g., vercel, netlify, cloudflare"
                disabled={!!platform || loading}
              />
              {errors.id && <p className="text-sm text-destructive">{errors.id}</p>}
              {!platform && (
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, hyphens, and underscores only. Cannot be changed after creation.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Platform Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Vercel, Netlify, Cloudflare Pages"
                disabled={loading}
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label}</p>}
              <p className="text-xs text-muted-foreground">
                Display name shown to users in the platform selector
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordering">
                Ordering <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ordering"
                type="number"
                min="0"
                value={formData.ordering}
                onChange={(e) => setFormData({ ...formData, ordering: parseInt(e.target.value) || 0 })}
                disabled={loading}
              />
              {errors.ordering && <p className="text-sm text-destructive">{errors.ordering}</p>}
              <p className="text-xs text-muted-foreground">
                Display order in the platform list (lower numbers appear first)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                disabled={loading}
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Enable this platform
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
              {platform ? 'Update' : 'Create'} Platform
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
