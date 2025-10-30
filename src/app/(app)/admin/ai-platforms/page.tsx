'use client'

import { useEffect, useState } from 'react'
import { AIPlatformWithParams } from '@/types/instruction'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Edit, Trash2, Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

export default function AdminAIPlatformsPage() {
  const { toast } = useToast()
  const [platforms, setPlatforms] = useState<AIPlatformWithParams[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<AIPlatformWithParams | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    label: '',
    description: '',
    ordering: 0,
    enabled: true,
    icon: '',
  })

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/admin/ai-platforms')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setPlatforms(data)
    } catch (error: any) {
      console.error('Error fetching platforms:', error)
      toast({
        title: 'Error Loading AI Platforms',
        description: error.message || 'Failed to load AI platforms. Check if migration has been run.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPlatform(null)
    setFormData({
      id: '',
      label: '',
      description: '',
      ordering: platforms.length,
      enabled: true,
      icon: '',
    })
    setDialogOpen(true)
  }

  const handleEdit = (platform: AIPlatformWithParams) => {
    setEditingPlatform(platform)
    setFormData({
      id: platform.id,
      label: platform.label,
      description: platform.description || '',
      ordering: platform.ordering,
      enabled: platform.enabled,
      icon: platform.icon || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingPlatform) {
        // Update existing platform
        const response = await fetch(`/api/admin/ai-platforms?id=${editingPlatform.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: formData.label,
            description: formData.description || undefined,
            ordering: formData.ordering,
            enabled: formData.enabled,
            icon: formData.icon || undefined,
          }),
        })

        if (!response.ok) throw new Error('Failed to update platform')
      } else {
        // Create new platform
        const response = await fetch('/api/admin/ai-platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create platform')
        }
      }

      toast({
        title: 'Success',
        description: editingPlatform ? 'Platform updated' : 'Platform created',
      })

      setDialogOpen(false)
      fetchPlatforms()
    } catch (error: any) {
      console.error('Error saving platform:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save platform',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this platform?')) return

    try {
      const response = await fetch(`/api/admin/ai-platforms?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete platform')
      }

      toast({
        title: 'Success',
        description: 'Platform deleted',
      })

      fetchPlatforms()
    } catch (error: any) {
      console.error('Error deleting platform:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete platform',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Platforms</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI platforms for instruction generation
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Platform
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Platforms</CardTitle>
          <CardDescription>
            Configure which AI platforms are available for instruction generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Parameters</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform) => (
                <TableRow key={platform.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{platform.label}</div>
                      {platform.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {platform.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {platform.id}
                    </code>
                  </TableCell>
                  <TableCell>{platform.ordering}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {platform.params?.length || 0} params
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={platform.enabled ? 'default' : 'secondary'}>
                      {platform.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(platform)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(platform.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPlatform ? 'Edit Platform' : 'Create Platform'}
            </DialogTitle>
            <DialogDescription>
              {editingPlatform
                ? 'Update the platform details'
                : 'Add a new AI platform to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="id">Platform ID</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="claude-code"
                disabled={!!editingPlatform}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, hyphens only. Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Claude Code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of the platform..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordering">Order</Label>
              <Input
                id="ordering"
                type="number"
                value={formData.ordering}
                onChange={(e) => setFormData({ ...formData, ordering: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="icon-name or URL"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPlatform ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
