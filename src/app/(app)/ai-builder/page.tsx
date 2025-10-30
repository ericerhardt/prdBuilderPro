'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AIPlatformSelector } from '@/components/instruction-builder/AIPlatformSelector'
import { TemplateSelector } from '@/components/instruction-builder/TemplateSelector'
import { DynamicPlatformParamsForm } from '@/components/instruction-builder/DynamicPlatformParamsForm'
import { DynamicTemplateParamsForm } from '@/components/instruction-builder/DynamicTemplateParamsForm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useWorkspaceStore } from '@/store/workspace'
import { Loader2, Sparkles, FileCode } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AIBuilderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { activeWorkspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [platformParams, setPlatformParams] = useState<Record<string, any>>({})
  const [templateParams, setTemplateParams] = useState<Record<string, any>>({})
  const [projectContext, setProjectContext] = useState('')
  const [useCase, setUseCase] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const handleGenerate = async () => {
    if (!selectedPlatform) {
      toast({
        title: 'Platform required',
        description: 'Please select an AI platform',
        variant: 'destructive',
      })
      return
    }

    if (!selectedTemplate) {
      toast({
        title: 'Template required',
        description: 'Please select an instruction type',
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
      const response = await fetch('/api/generate-instruction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          template: selectedTemplate,
          formData: {
            platformParams,
            templateParams,
            projectContext,
            useCase,
            additionalNotes,
          },
          workspaceId: activeWorkspace.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate instruction')
      }

      const data = await response.json()
      router.push(`/ai-instructions/${data.id}`)
    } catch (error) {
      console.error('Error generating instruction:', error)
      toast({
        title: 'Generation failed',
        description: 'Failed to generate instruction. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <FileCode className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">AI Instruction Builder</h1>
            <p className="text-muted-foreground mt-1">
              Generate AI agent instructions, prompts, skills, and configurations
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Platform & Template Selection */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform & Type</CardTitle>
              <CardDescription>
                Choose your AI platform and instruction type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AIPlatformSelector
                value={selectedPlatform}
                onChange={setSelectedPlatform}
              />

              <TemplateSelector
                platformId={selectedPlatform}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
              />

              {selectedPlatform && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-4">Platform Settings</h3>
                  <DynamicPlatformParamsForm
                    platformId={selectedPlatform}
                    values={platformParams}
                    onChange={setPlatformParams}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center - Template Parameters & Context */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instruction Details</CardTitle>
              <CardDescription>
                Configure the specific parameters for this instruction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTemplate ? (
                <>
                  <DynamicTemplateParamsForm
                    templateId={selectedTemplate}
                    values={templateParams}
                    onChange={setTemplateParams}
                  />

                  <div className="pt-4 border-t space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="useCase">Use Case</Label>
                      <Textarea
                        id="useCase"
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        placeholder="Describe the specific use case or scenario..."
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground">
                        What problem are you trying to solve?
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a platform and instruction type to continue
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Additional Context & Generate */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Context</CardTitle>
              <CardDescription>
                Optional: Provide context about your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectContext">Project Overview</Label>
                <Textarea
                  id="projectContext"
                  value={projectContext}
                  onChange={(e) => setProjectContext(e.target.value)}
                  placeholder="Tech stack, architecture, conventions..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Requirements</Label>
                <Textarea
                  id="additionalNotes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any specific requirements or constraints..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPlatform ? (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Getting Started</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Select your AI platform (Claude Code, Cursor, etc.)</li>
                    <li>Choose the type of instruction to generate</li>
                    <li>Fill in the specific parameters</li>
                    <li>Add context to make it more relevant</li>
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Best Practices</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Be specific about your use case</li>
                    <li>Include relevant project context</li>
                    <li>Review and customize generated output</li>
                    <li>Test with your AI system</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleGenerate}
                disabled={loading || !selectedPlatform || !selectedTemplate}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Instruction
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
