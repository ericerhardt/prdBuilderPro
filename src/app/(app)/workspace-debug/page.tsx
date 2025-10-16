'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, RefreshCw, Plus, CheckCircle, XCircle } from 'lucide-react'

export default function WorkspaceDebugPage() {
  const { toast } = useToast()
  const { activeWorkspace, setActiveWorkspace, clearWorkspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    setLoading(true)
    try {
      // Get user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      console.log('[Debug] User:', authUser, 'Error:', authError)

      if (authError || !authUser) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in first',
          variant: 'destructive',
        })
        return
      }

      setUser(authUser)

      // Fetch workspaces
      const { data: memberships, error: memberError } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace:workspaces (
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', authUser.id)

      console.log('[Debug] Workspaces:', memberships, 'Error:', memberError)

      if (memberError) {
        toast({
          title: 'Error fetching workspaces',
          description: memberError.message,
          variant: 'destructive',
        })
      }

      setWorkspaces(memberships || [])
    } catch (error: any) {
      console.error('[Debug] Error:', error)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createWorkspace = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workspace')
      }

      toast({
        title: 'Success!',
        description: 'Workspace created successfully',
      })

      // Refresh data
      await fetchDebugInfo()

      // Set as active workspace
      if (data.workspace) {
        setActiveWorkspace(data.workspace, 'owner')
      }
    } catch (error: any) {
      console.error('[Debug] Create error:', error)
      toast({
        title: 'Error creating workspace',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const setActive = (workspace: any, role: 'owner' | 'admin' | 'editor' | 'viewer') => {
    setActiveWorkspace(workspace, role)
    toast({
      title: 'Active workspace set',
      description: `${workspace.name} is now active`,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workspace Debug</h1>
        <p className="text-muted-foreground mt-2">
          Debug and manage workspace initialization
        </p>
      </div>

      <div className="space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> <code className="text-xs">{user.id}</code></p>
                <p><strong>Email:</strong> {user.email}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Not authenticated</p>
            )}
          </CardContent>
        </Card>

        {/* Active Workspace */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Active Workspace (Zustand Store)</CardTitle>
                <CardDescription>Currently selected workspace</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearWorkspace}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeWorkspace ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p><strong>Name:</strong> {activeWorkspace.name}</p>
                </div>
                <p><strong>ID:</strong> <code className="text-xs">{activeWorkspace.id}</code></p>
                <p><strong>Created:</strong> {new Date(activeWorkspace.created_at).toLocaleString()}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-muted-foreground">No active workspace</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Workspaces */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Database Workspaces</CardTitle>
                <CardDescription>Workspaces from Supabase</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchDebugInfo}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button size="sm" onClick={createWorkspace} disabled={creating}>
                  {creating ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Creating...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-1" />Create New</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-muted-foreground mb-4">No workspaces found in database</p>
                <Button onClick={createWorkspace} disabled={creating}>
                  {creating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" />Create Workspace</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaces.map((membership: any) => {
                  const ws = membership.workspace
                  const isActive = activeWorkspace?.id === ws.id

                  return (
                    <div key={ws.id} className={`p-4 border rounded-lg ${isActive ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{ws.name}</p>
                            {isActive && <Badge>Active</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">Role: {membership.role}</p>
                          <p className="text-xs text-muted-foreground"><code>{ws.id}</code></p>
                          <p className="text-xs text-muted-foreground">Created: {new Date(ws.created_at).toLocaleString()}</p>
                        </div>
                        {!isActive && (
                          <Button size="sm" onClick={() => setActive(ws, membership.role)}>
                            Set Active
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console Logs Notice */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check your browser console for detailed logs. All operations are logged with [Debug] or [API] prefixes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
