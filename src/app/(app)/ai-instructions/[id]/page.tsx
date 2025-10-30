'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InstructionDocument } from '@/types/instruction'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useWorkspaceStore } from '@/store/workspace'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import {
  Loader2,
  Save,
  Download,
  Copy,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  FileCode
} from 'lucide-react'

interface InstructionEditorPageProps {
  params: {
    id: string
  }
}

export default function InstructionEditorPage({ params }: InstructionEditorPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { activeWorkspace, userRole } = useWorkspaceStore()
  const [instruction, setInstruction] = useState<InstructionDocument | null>(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const canEdit = userRole && ['owner', 'admin', 'editor'].includes(userRole)

  useEffect(() => {
    fetchInstruction()
  }, [params.id])

  const fetchInstruction = async () => {
    try {
      const { data, error } = await supabase
        .from('instruction_documents')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      setInstruction(data)
      setContent(data.body_content)
      setOriginalContent(data.body_content)
    } catch (error) {
      console.error('Error fetching instruction:', error)
      toast({
        title: 'Error',
        description: 'Failed to load instruction',
        variant: 'destructive',
      })
      router.push('/ai-instructions')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!instruction || !canEdit || content === originalContent) return

    setSaving(true)
    try {
      // Update instruction document
      const { error: updateError } = await supabase
        .from('instruction_documents')
        .update({
          body_content: content,
          version: instruction.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instruction.id)

      if (updateError) throw updateError

      // Create new version record
      const { error: versionError } = await supabase
        .from('instruction_versions')
        .insert({
          instruction_id: instruction.id,
          version: instruction.version + 1,
          body_content: content,
          params: instruction.params,
        })

      if (versionError) throw versionError

      setOriginalContent(content)
      setInstruction({ ...instruction, version: instruction.version + 1 })

      toast({
        title: 'Saved',
        description: 'Instruction has been updated',
      })
    } catch (error) {
      console.error('Error saving instruction:', error)
      toast({
        title: 'Error',
        description: 'Failed to save instruction',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast({
        title: 'Copied',
        description: 'Instruction copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = instruction?.file_name || `${instruction?.title || 'instruction'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTemplateId = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getTemplateColor = (templateId: string) => {
    switch (templateId) {
      case 'system-prompt':
        return 'bg-blue-100 text-blue-800'
      case 'sub-agent':
        return 'bg-purple-100 text-purple-800'
      case 'skill':
        return 'bg-green-100 text-green-800'
      case 'mcp-connector':
        return 'bg-orange-100 text-orange-800'
      case 'slash-command':
        return 'bg-pink-100 text-pink-800'
      case 'workflow':
        return 'bg-indigo-100 text-indigo-800'
      case 'context-file':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlatformBadgeColor = (platformId: string) => {
    switch (platformId) {
      case 'claude-code':
        return 'bg-amber-100 text-amber-800'
      case 'cursor':
        return 'bg-cyan-100 text-cyan-800'
      case 'aider':
        return 'bg-emerald-100 text-emerald-800'
      case 'github-copilot':
        return 'bg-slate-100 text-slate-800'
      case 'windsurf':
        return 'bg-violet-100 text-violet-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Detect if content is JSON
  const isJSON = (str: string) => {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!instruction) {
    return null
  }

  const contentIsJSON = isJSON(content)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileCode className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{instruction.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getTemplateColor(instruction.template_id)} variant="secondary">
                  {formatTemplateId(instruction.template_id)}
                </Badge>
                <Badge className={getPlatformBadgeColor(instruction.platform_id)} variant="outline">
                  {formatTemplateId(instruction.platform_id)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {canEdit && content !== originalContent && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {instruction.file_name && (
            <>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {instruction.file_name}
              </code>
              <span>•</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Version {instruction.version}
          </span>
          <span>•</span>
          <span>
            {new Date(instruction.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Editor/Preview */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList>
              <TabsTrigger value="preview">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="edit" disabled={!canEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="preview" className="mt-0">
              {contentIsJSON ? (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">
                    {JSON.stringify(JSON.parse(content), null, 2)}
                  </code>
                </pre>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              )}
            </TabsContent>
            <TabsContent value="edit" className="mt-0">
              {canEdit ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[600px] font-mono text-sm"
                  placeholder="Enter your instruction content..."
                />
              ) : (
                <p className="text-muted-foreground">
                  You don't have permission to edit this instruction.
                </p>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Usage Guide */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Usage Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="space-y-2">
            <p>
              <strong>Platform:</strong> {formatTemplateId(instruction.platform_id)}
            </p>
            <p>
              <strong>Type:</strong> {formatTemplateId(instruction.template_id)}
            </p>
            {instruction.file_name && (
              <p>
                <strong>Suggested filename:</strong> <code className="bg-muted px-2 py-1 rounded">{instruction.file_name}</code>
              </p>
            )}
            <div className="pt-4 border-t">
              <p className="font-semibold mb-2">How to use:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy or download the instruction file</li>
                <li>Place it in the appropriate location for your AI platform</li>
                <li>Customize as needed for your specific use case</li>
                <li>Test with your AI system to ensure it works as expected</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
