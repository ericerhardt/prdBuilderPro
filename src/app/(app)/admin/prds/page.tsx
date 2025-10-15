'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { PRDDocument } from '@/types/prd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Search, FileText, Trash2, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AdminPRDsPage() {
  const { activeWorkspace } = useWorkspaceStore()
  const { toast } = useToast()
  const [prds, setPRDs] = useState<PRDDocument[]>([])
  const [filteredPRDs, setFilteredPRDs] = useState<PRDDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')
  const supabase = createClient()

  useEffect(() => {
    if (activeWorkspace) {
      fetchPRDs()
    }
  }, [activeWorkspace])

  useEffect(() => {
    filterAndSortPRDs()
  }, [searchQuery, platformFilter, sortBy, prds])

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
      toast({
        title: 'Error',
        description: 'Failed to load PRDs.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortPRDs = () => {
    let filtered = [...prds]

    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(prd => prd.platform === platformFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(prd =>
        prd.title.toLowerCase().includes(query) ||
        prd.platform.toLowerCase().includes(query) ||
        prd.created_by.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    setFilteredPRDs(filtered)
  }

  const handleDeletePRD = async (prdId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('prd_documents')
        .delete()
        .eq('id', prdId)

      if (error) throw error

      toast({
        title: 'PRD deleted',
        description: 'The PRD has been permanently deleted.',
      })

      fetchPRDs()
    } catch (error) {
      console.error('Error deleting PRD:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete PRD.',
        variant: 'destructive',
      })
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All PRDs</h2>
        <p className="text-muted-foreground">
          Comprehensive view of all workspace PRDs
        </p>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title, platform, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="replit">Replit</SelectItem>
            <SelectItem value="bolt">Bolt.new</SelectItem>
            <SelectItem value="leap">Leap.new</SelectItem>
            <SelectItem value="lovable">Lovable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
            <SelectItem value="title">Title (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total PRDs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prds.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Replit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prds.filter(p => p.platform === 'replit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bolt.new</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prds.filter(p => p.platform === 'bolt').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prds.filter(p => {
                const created = new Date(p.created_at)
                const now = new Date()
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PRD List */}
      <Card>
        <CardContent className="pt-6">
          {filteredPRDs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No PRDs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPRDs.map((prd) => (
                <div
                  key={prd.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium truncate">{prd.title}</h3>
                      <Badge className={getPlatformColor(prd.platform)}>
                        {prd.platform}
                      </Badge>
                      <Badge variant="outline">v{prd.version}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Created by: {prd.created_by.substring(0, 8)}...</span>
                      <span>Updated {formatDistanceToNow(new Date(prd.updated_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/editor/${prd.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePRD(prd.id, prd.title)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
