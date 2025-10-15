'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PRDDocument, PRDSection } from '@/types/prd'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useWorkspaceStore } from '@/store/workspace'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ReactMarkdown from 'react-markdown'
import { 
  Loader2, 
  Save, 
  Download, 
  Copy, 
  Eye, 
  Edit, 
  Clock,
  CheckCircle
} from 'lucide-react'

interface EditorPageProps {
  params: {
    id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { activeWorkspace, userRole } = useWorkspaceStore()
  const [prd, setPRD] = useState<PRDDocument | null>(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const canEdit = userRole && ['owner', 'admin', 'editor'].includes(userRole)

  useEffect(() => {
    fetchPRD()
  }, [params.id])

  const fetchPRD = async () => {
    try {
      const { data, error } = await supabase
        .from('prd_documents')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setPRD(data)
      setContent(data.body_markdown)
      setOriginalContent(data.body_markdown)
    } catch (error) {
      console.error('Error fetching PRD:', error)
      toast({
        title: 'Error',
        description: 'Failed to load PRD',
        variant: 'destructive',
      })
      router.push('/builder')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!prd || !canEdit || content === originalContent) return

    setSaving(true)
    try {
      // Update PRD document
      const { error: updateError } = await supabase
        .from('prd_documents')
        .update({
          body_markdown: content,
          version: prd.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prd.id)

      if (updateError) throw updateError

      // Create new version record
      const { error: versionError } = await supabase
        .from('prd_versions')
        .insert({
          prd_id: prd.id,
          version: prd.version + 1,
          body_markdown: content,
          params: prd.params,
        })

      if (versionError) throw versionError

      setOriginalContent(content)
      setPRD({ ...prd, version: prd.version + 1 })
      
      toast({
        title: 'Saved',
        description: 'PRD has been updated',
      })
    } catch (error) {
      console.error('Error saving PRD:', error)
      toast({
        title: 'Error',
        description: 'Failed to save PRD',
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
        description: 'PRD copied to clipboard',
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
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prd?.title || 'prd'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Parse sections from markdown
  const parseSections = (markdown: string): PRDSection[] => {
    const lines = markdown.split('\n')
    const sections: PRDSection[] = []
    let currentSection: PRDSection | undefined
    let sectionContent: string[] = []

    lines.forEach((line) => {
      const h2Match = line.match(/^##\s+(.+)/)
      const h1Match = line.match(/^#\s+(.+)/)

      if (h2Match) {
        if (currentSection) {
          currentSection.content = sectionContent.join('\n').trim()
          sections.push(currentSection)
        }
        currentSection = {
          id: h2Match[1].toLowerCase().replace(/\s+/g, '-'),
          title: h2Match[1],
          content: '',
          order: sections.length,
        }
        sectionContent = []
      } else if (h1Match && sections.length === 0) {
        // Handle the title as a special section
        sections.push({
          id: 'title',
          title: h1Match[1],
          content: '',
          order: 0,
        })
      } else if (currentSection) {
        sectionContent.push(line)
      }
    })

    if (currentSection) {
      currentSection.content = sectionContent.join('\n').trim()
      sections.push(currentSection)
    }

    return sections
  }

  const sections = parseSections(content)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!prd) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{prd.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{prd.platform}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Version {prd.version}
            </span>
            <span>•</span>
            <span>
              {new Date(prd.updated_at).toLocaleDateString()}
            </span>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Editor/Preview */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="edit" disabled={!canEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <TabsContent value="edit" className="mt-0">
                {canEdit ? (
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[600px] font-mono text-sm"
                    placeholder="Enter your PRD content in Markdown..."
                  />
                ) : (
                  <p className="text-muted-foreground">
                    You don't have permission to edit this PRD.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="preview" className="mt-0">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
