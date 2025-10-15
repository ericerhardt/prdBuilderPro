'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, User, Mail, Building, Shield, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface UserProfile {
  id: string
  email: string
  created_at: string
}

interface WorkspaceMembership {
  workspace: {
    id: string
    name: string
    created_at: string
  }
  role: string
}

export default function AccountPage() {
  const { toast } = useToast()
  const { activeWorkspace } = useWorkspaceStore()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Give the WorkspaceInitializer time to load
    const timer = setTimeout(() => {
      setWorkspaceLoading(false)
      fetchUserData()
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUserData = async () => {
    try {
      // Get user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        throw new Error('User not authenticated')
      }

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        created_at: authUser.created_at || new Date().toISOString(),
      })

      // Get user's workspace memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace:workspaces!inner(
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', authUser.id)

      if (membershipsError) throw membershipsError

      setWorkspaces(memberships as unknown as WorkspaceMembership[])
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load account information.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'editor':
        return 'bg-green-100 text-green-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
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

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not Authenticated</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Please sign in to view your account information.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and workspace memberships
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-id">User ID</Label>
              <Input
                id="user-id"
                value={user.id}
                readOnly
                disabled
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                readOnly
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-since">Member Since</Label>
              <Input
                id="member-since"
                value={new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                readOnly
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Workspace Memberships */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Workspaces
            </CardTitle>
            <CardDescription>
              Workspaces you belong to and your role in each
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  You are not a member of any workspace yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaces.map((membership, index) => (
                  <div key={membership.workspace.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{membership.workspace.name}</h4>
                          {activeWorkspace?.id === membership.workspace.id && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(membership.workspace.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getRoleBadgeColor(membership.role)}>
                        <Shield className="mr-1 h-3 w-3" />
                        {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="font-semibold mb-2">Sign Out</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign out of your account on this device.
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Change Password</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  To change your password, please sign out and use the "Forgot Password" link on the login page.
                </p>
                <Button variant="outline" disabled>
                  Managed via Supabase Auth
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
