'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { InstructionDocument } from '@/types/instruction'
import { useWorkspaceStore } from '@/store/workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, FileCode, Plus, Clock, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AIInstructionsLibraryPage() {
  const router = useRouter()
  const { activeWorkspace } = useWorkspaceStore()
  const [instructions, setInstructions] = useState<InstructionDocument[]>([])
  const [filteredInstructions, setFilteredInstructions] = useState<InstructionDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    // Give the WorkspaceInitializer time to load the workspace
    const timer = setTimeout(() => {
      setWorkspaceLoading(false)
      if (activeWorkspace) {
        fetchInstructions()
      } else {
        setLoading(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!workspaceLoading && activeWorkspace) {
      fetchInstructions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, workspaceLoading])

  useEffect(() => {
    filterInstructions()
  }, [searchQuery, platformFilter, templateFilter, instructions])

  const fetchInstructions = async () => {
    if (!activeWorkspace) return

    try {
      const { data, error } = await supabase
        .from('instruction_documents')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setInstructions(data || [])
    } catch (error) {
      console.error('Error fetching instructions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterInstructions = () => {
    let filtered = instructions

    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(inst => inst.platform_id === platformFilter)
    }

    // Apply template filter
    if (templateFilter !== 'all') {
      filtered = filtered.filter(inst => inst.template_id === templateFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(inst =>
        inst.title.toLowerCase().includes(query) ||
        inst.platform_id.toLowerCase().includes(query) ||
        inst.template_id.toLowerCase().includes(query)
      )
    }

    setFilteredInstructions(filtered)
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

  const formatTemplateId = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!activeWorkspace) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workspace Found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              You need to be part of a workspace to access the library. Please contact your workspace administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Instruction Library</h1>
            <p className="text-muted-foreground mt-2">
              Browse and manage your AI agent instructions and configurations
            </p>
          </div>
          <Link href="/ai-builder">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Instruction
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search instructions by title, platform, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="claude-code">Claude Code</SelectItem>
            <SelectItem value="cursor">Cursor</SelectItem>
            <SelectItem value="aider">Aider</SelectItem>
            <SelectItem value="github-copilot">GitHub Copilot</SelectItem>
            <SelectItem value="windsurf">Windsurf</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="system-prompt">System Prompt</SelectItem>
            <SelectItem value="sub-agent">Sub-Agent</SelectItem>
            <SelectItem value="skill">Skill</SelectItem>
            <SelectItem value="mcp-connector">MCP Connector</SelectItem>
            <SelectItem value="slash-command">Slash Command</SelectItem>
            <SelectItem value="workflow">Workflow</SelectItem>
            <SelectItem value="context-file">Context File</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Instructions Grid */}
      {filteredInstructions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || platformFilter !== 'all' || templateFilter !== 'all'
                ? 'No instructions found'
                : 'No instructions yet'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              {searchQuery || platformFilter !== 'all' || templateFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first AI instruction to get started'
              }
            </p>
            {(!searchQuery && platformFilter === 'all' && templateFilter === 'all') && (
              <Link href="/ai-builder">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Instruction
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructions.map((instruction) => (
            <Link key={instruction.id} href={`/ai-instructions/${instruction.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="line-clamp-2">{instruction.title}</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={getTemplateColor(instruction.template_id)} variant="secondary">
                      {formatTemplateId(instruction.template_id)}
                    </Badge>
                    <Badge className={getPlatformBadgeColor(instruction.platform_id)} variant="outline">
                      {formatTemplateId(instruction.platform_id)}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(instruction.updated_at), { addSuffix: true })}
                    </span>
                    <span>v{instruction.version}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {instruction.file_name && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <Download className="h-3 w-3" />
                      <code className="bg-muted px-2 py-1 rounded">{instruction.file_name}</code>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {extractExcerpt(instruction.body_content)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function extractExcerpt(content: string): string {
  // Remove markdown formatting and extract first paragraph
  const plainText = content
    .replace(/^#.*$/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .trim()

  const firstParagraph = plainText.split('\n\n')[0]
  return firstParagraph || 'No description available.'
}
