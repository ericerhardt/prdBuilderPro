'use client'

import { useEffect, useState } from 'react'
import { Platform, PlatformParam } from '@/types/prd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Settings, CheckCircle, XCircle, Plus, Pencil, Trash2 } from 'lucide-react'
import { PlatformDialog } from '@/components/admin/PlatformDialog'
import { PlatformParamDialog } from '@/components/admin/PlatformParamDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PlatformWithParams extends Platform {
  params?: PlatformParam[]
}

export default function AdminPlatformsPage() {
  const { toast } = useToast()
  const [platforms, setPlatforms] = useState<PlatformWithParams[]>([])
  const [loading, setLoading] = useState(true)
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false)
  const [paramDialogOpen, setParamDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedParam, setSelectedParam] = useState<PlatformParam | null>(null)
  const [activePlatformId, setActivePlatformId] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'platform' | 'param'; id: string | number; name: string } | null>(null)

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/platforms')
      if (!response.ok) throw new Error('Failed to fetch platforms')

      const data = await response.json()
      setPlatforms(data)
    } catch (error) {
      console.error('Error fetching platforms:', error)
      toast({
        title: 'Error',
        description: 'Failed to load platform configuration.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePlatform = async (platformId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/platforms?id=${platformId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      })

      if (!response.ok) throw new Error('Failed to update platform')

      toast({
        title: 'Platform updated',
        description: `Platform ${!currentEnabled ? 'enabled' : 'disabled'} successfully.`,
      })

      fetchPlatforms()
    } catch (error) {
      console.error('Error toggling platform:', error)
      toast({
        title: 'Error',
        description: 'Failed to update platform.',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePlatform = async (platformId: string) => {
    try {
      const response = await fetch(`/api/admin/platforms?id=${platformId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete platform')
      }

      toast({
        title: 'Platform deleted',
        description: 'Platform deleted successfully.',
      })

      fetchPlatforms()
    } catch (error) {
      console.error('Error deleting platform:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete platform.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteParam = async (paramId: number) => {
    try {
      const response = await fetch(`/api/admin/platforms/params?id=${paramId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete parameter')

      toast({
        title: 'Parameter deleted',
        description: 'Parameter deleted successfully.',
      })

      fetchPlatforms()
    } catch (error) {
      console.error('Error deleting parameter:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete parameter.',
        variant: 'destructive',
      })
    }
  }

  const confirmDelete = (type: 'platform' | 'param', id: string | number, name: string) => {
    setItemToDelete({ type, id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    if (itemToDelete.type === 'platform') {
      await handleDeletePlatform(itemToDelete.id as string)
    } else {
      await handleDeleteParam(itemToDelete.id as number)
    }

    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const getParamTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      text: 'bg-blue-100 text-blue-800',
      textarea: 'bg-green-100 text-green-800',
      select: 'bg-purple-100 text-purple-800',
      multiselect: 'bg-pink-100 text-pink-800',
      boolean: 'bg-yellow-100 text-yellow-800',
    }
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>{type}</Badge>
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
          <h2 className="text-2xl font-bold">Platform Configuration</h2>
          <p className="text-muted-foreground">
            Manage available platforms and their parameters
          </p>
        </div>
        <Button onClick={() => {
          setSelectedPlatform(null)
          setPlatformDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Platform
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => (
          <Card key={platform.id} className={!platform.enabled ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {platform.label}
                  </CardTitle>
                  <CardDescription>
                    {platform.params?.length || 0} parameters configured
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {platform.enabled ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      <XCircle className="mr-1 h-3 w-3" />
                      Disabled
                    </Badge>
                  )}
                  <Switch
                    checked={platform.enabled}
                    onCheckedChange={() => handleTogglePlatform(platform.id, platform.enabled)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPlatform(platform)
                      setPlatformDialogOpen(true)
                    }}
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit Platform
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirmDelete('platform', platform.id, platform.label)}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </Button>
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="params">
                    <AccordionTrigger>
                      Parameters ({platform.params?.length || 0})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setActivePlatformId(platform.id)
                            setSelectedParam(null)
                            setParamDialogOpen(true)
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Parameter
                        </Button>

                        {platform.params && platform.params.length > 0 ? (
                          platform.params.map((param) => (
                            <div key={param.id} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{param.label}</span>
                                    {param.required && (
                                      <Badge variant="outline" className="text-xs">Required</Badge>
                                    )}
                                    {param.advanced && (
                                      <Badge variant="outline" className="text-xs">Advanced</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Key: <code className="text-xs bg-muted px-1 py-0.5 rounded">{param.key}</code>
                                  </p>
                                  {param.help && (
                                    <p className="text-xs text-muted-foreground mt-1">{param.help}</p>
                                  )}
                                </div>
                                {getParamTypeBadge(param.type)}
                              </div>
                              {param.options && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium">Options: </span>
                                  {JSON.stringify(param.options)}
                                </div>
                              )}
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setActivePlatformId(platform.id)
                                    setSelectedParam(param)
                                    setParamDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => confirmDelete('param', param.id, param.label)}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No parameters configured
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {platforms.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No platforms configured yet.</p>
              <Button onClick={() => {
                setSelectedPlatform(null)
                setPlatformDialogOpen(true)
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Platform
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PlatformDialog
        open={platformDialogOpen}
        onOpenChange={setPlatformDialogOpen}
        platform={selectedPlatform}
        onSuccess={fetchPlatforms}
      />

      <PlatformParamDialog
        open={paramDialogOpen}
        onOpenChange={setParamDialogOpen}
        platformId={activePlatformId}
        param={selectedParam}
        onSuccess={fetchPlatforms}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{itemToDelete?.name}</strong>.
              {itemToDelete?.type === 'platform' && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete all associated parameters. Platforms with existing PRD documents cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
