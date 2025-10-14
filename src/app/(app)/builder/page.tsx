'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlatformSelector } from '@/components/builder/PlatformSelector'
import { DynamicParamsForm } from '@/components/builder/DynamicParamsForm'
import { CoreInputs } from '@/components/builder/CoreInputs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useWorkspaceStore } from '@/store/workspace'
import { Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BuilderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { activeWorkspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [platformParams, setPlatformParams] = useState<Record<string, any>>({})
  const [coreInputs, setCoreInputs] = useState({
    productPitch: '',
    targetUsers: '',
    coreFeatures: [] as string[],
    dataEntities: '',
    designVibe: 'professional' as any,
    includeBilling: false,
  })

  const handleGenerate = async () => {
    if (!selectedPlatform) {
      toast({
        title: 'Platform required',
        description: 'Please select a target platform',
        variant: 'destructive',
      })
      return
    }

    if (!coreInputs.productPitch || !coreInputs.targetUsers || coreInputs.coreFeatures.length === 0 || !coreInputs.dataEntities) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if (!activeWorkspace) {
      toast({
        title: 'No workspace',
        description: 'Please select a workspace',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          formData: {
            ...coreInputs,
            platformParams,
          },
          workspaceId: activeWorkspace.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PRD')
      }

      const data = await response.json()
      router.push(`/editor/${data.id}`)
    } catch (error) {
      console.error('Error generating PRD:', error)
      toast({
        title: 'Generation failed',
        description: 'Failed to generate PRD. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">PRD Builder</h1>
        <p className="text-muted-foreground mt-2">
          Generate a platform-specific PRD in minutes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Platform & Params */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Choose your target platform and configure its parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PlatformSelector
                value={selectedPlatform}
                onChange={setSelectedPlatform}
              />
              
              {selectedPlatform && (
                <DynamicParamsForm
                  platformId={selectedPlatform}
                  values={platformParams}
                  onChange={setPlatformParams}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center - Core Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>
                Describe what you're building
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoreInputs
                values={coreInputs}
                onChange={setCoreInputs}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Tips & Generate */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPlatform ? (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Getting Started</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Select a target platform to see its specific options</li>
                    <li>Each platform has unique parameters and conventions</li>
                    <li>The PRD will be tailored to your chosen platform</li>
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Platform-Specific Tips</p>
                  {selectedPlatform === 'replit' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Replit uses Nix for package management</li>
                      <li>Consider Replit DB for simple persistence</li>
                      <li>Secrets are managed via environment variables</li>
                    </ul>
                  )}
                  {selectedPlatform === 'bolt' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Bolt.new excels at Next.js and Remix apps</li>
                      <li>Supabase integration is seamless</li>
                      <li>Consider Vercel for deployment</li>
                    </ul>
                  )}
                  {selectedPlatform === 'leap' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>MCP connectors enable rich integrations</li>
                      <li>Focus on AI-powered workflows</li>
                      <li>Include guardrails for safety</li>
                    </ul>
                  )}
                  {selectedPlatform === 'lovable' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Lovable supports full-stack apps</li>
                      <li>GitHub integration is built-in</li>
                      <li>Collaboration features are key</li>
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleGenerate}
                disabled={loading || !selectedPlatform}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PRD...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate PRD
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
