'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PRDDocument } from '@/types/prd'
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
import { Loader2, Search, FileText, Plus, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function LibraryPage() {
  const router = useRouter()
  const { activeWorkspace } = useWorkspaceStore()
  const [prds, setPRDs] = useState<PRDDocument[]>([])
  const [filteredPRDs, setFilteredPRDs] = useState<PRDDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    // Give the WorkspaceInitializer time to load the workspace
    const timer = setTimeout(() => {
      setWorkspaceLoading(false)
      if (activeWorkspace) {
        fetchPRDs()
      } else {
        setLoading(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!workspaceLoading && activeWorkspace) {
      fetchPRDs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, workspaceLoading])

  useEffect(() => {
    filterPRDs()
  }, [searchQuery, platformFilter, prds])

  const fetchPRDs = async () => {
    if (!activeWorkspace) return

    try {
      const { data, error } = await supabase
        .from('prd_documents')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setPRDs(data || [])
    } catch (error) {
      console.error('Error fetching PRDs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPRDs = () => {
    let filtered = prds

    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(prd => prd.platform === platformFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(prd => 
        prd.title.toLowerCase().includes(query) ||
        prd.platform.toLowerCase().includes(query)
      )
    }

    setFilteredPRDs(filtered)
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'replit':
        return 'bg-orange-100 text-orange-800'
      case 'bolt':
        return 'bg-blue-100 text-blue-800'
      case 'leap':
        return 'bg-purple-100 text-purple-800'
      case 'lovable':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
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
            <h1 className="text-3xl font-bold">PRD Library</h1>
            <p className="text-muted-foreground mt-2">
              Browse and manage your product requirement documents
            </p>
          </div>
          <Link href="/builder">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New PRD
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
            placeholder="Search PRDs by title or platform..."
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
            <SelectItem value="replit">Replit</SelectItem>
            <SelectItem value="bolt">Bolt.new</SelectItem>
            <SelectItem value="leap">Leap.new</SelectItem>
            <SelectItem value="lovable">Lovable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* PRD Grid */}
      {filteredPRDs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || platformFilter !== 'all' ? 'No PRDs found' : 'No PRDs yet'}
            </h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              {searchQuery || platformFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first PRD to get started'
              }
            </p>
            {(!searchQuery && platformFilter === 'all') && (
              <Link href="/builder">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create PRD
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPRDs.map((prd) => (
            <Link key={prd.id} href={`/editor/${prd.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="line-clamp-2">{prd.title}</CardTitle>
                    <Badge className={getPlatformColor(prd.platform)}>
                      {prd.platform}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(prd.updated_at), { addSuffix: true })}
                    </span>
                    <span>v{prd.version}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {extractExcerpt(prd.body_markdown)}
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

function extractExcerpt(markdown: string): string {
  // Remove markdown formatting and extract first paragraph
  const plainText = markdown
    .replace(/^#.*$/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .trim()
  
  const firstParagraph = plainText.split('\n\n')[0]
  return firstParagraph || 'No description available.'
}

// Add date-fns dependency to package.json
