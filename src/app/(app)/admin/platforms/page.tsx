'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Platform, PlatformParam } from '@/types/prd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Settings, CheckCircle, XCircle } from 'lucide-react'

interface PlatformWithParams extends Platform {
  params?: PlatformParam[]
}

export default function AdminPlatformsPage() {
  const { toast } = useToast()
  const [platforms, setPlatforms] = useState<PlatformWithParams[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const { data: platformsData, error: platformsError } = await supabase
        .from('platforms')
        .select('*')
        .order('ordering')

      if (platformsError) throw platformsError

      // Fetch params for each platform
      const { data: paramsData, error: paramsError } = await supabase
        .from('platform_params')
        .select('*')
        .order('id')

      if (paramsError) throw paramsError

      // Combine platforms with their params
      const platformsWithParams = platformsData.map(platform => ({
        ...platform,
        params: paramsData.filter(param => param.platform_id === platform.id),
      }))

      setPlatforms(platformsWithParams)
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
      const { error } = await supabase
        .from('platforms')
        .update({ enabled: !currentEnabled })
        .eq('id', platformId)

      if (error) throw error

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
      <div>
        <h2 className="text-2xl font-bold">Platform Configuration</h2>
        <p className="text-muted-foreground">
          Manage available platforms and their parameters
        </p>
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
              <Accordion type="single" collapsible>
                <AccordionItem value="params">
                  <AccordionTrigger>
                    View Parameters ({platform.params?.length || 0})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Platform configuration is managed through database migrations.</p>
            <p className="text-sm">
              To add new platforms or parameters, update the Supabase migration file.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
