'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { WorkspaceMember } from '@/types/prd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, UserPlus, Mail, Shield, Edit, Trash2 } from 'lucide-react'

interface MemberWithEmail extends WorkspaceMember {
  email?: string
}

export default function AdminUsersPage() {
  const { activeWorkspace, userRole } = useWorkspaceStore()
  const { toast } = useToast()
  const [members, setMembers] = useState<MemberWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'admin'>('editor')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (activeWorkspace) {
      fetchMembers()
    }
  }, [activeWorkspace])

  const fetchMembers = async () => {
    if (!activeWorkspace) return

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)

      if (error) throw error

      // Fetch user emails from auth.users (requires service role in production)
      // For now, we'll just show user IDs
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast({
        title: 'Error',
        description: 'Failed to load workspace members.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!activeWorkspace || !inviteEmail) return

    setInviteLoading(true)

    try {
      // In production, this would:
      // 1. Send an invitation email
      // 2. Create a pending invitation record
      // 3. User accepts and gets added to workspace_members

      // For now, we'll show a placeholder
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${inviteEmail}`,
      })

      setInviteEmail('')
      setDialogOpen(false)
    } catch (error) {
      console.error('Error inviting user:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation.',
        variant: 'destructive',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!activeWorkspace || userRole !== 'owner') {
      toast({
        title: 'Permission denied',
        description: 'Only workspace owners can change roles.',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully.',
      })

      fetchMembers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspace || userRole !== 'owner') {
      toast({
        title: 'Permission denied',
        description: 'Only workspace owners can remove members.',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: 'Member removed',
        description: 'User has been removed from the workspace.',
      })

      fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove user.',
        variant: 'destructive',
      })
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-purple-100 text-purple-800"><Shield className="mr-1 h-3 w-3" />Owner</Badge>
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
      case 'editor':
        return <Badge className="bg-green-100 text-green-800">Editor</Badge>
      case 'viewer':
        return <Badge variant="outline">Viewer</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workspace Members</h2>
          <p className="text-muted-foreground">
            Manage team access and roles
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your workspace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'admin')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor - Can create and edit PRDs</SelectItem>
                    <SelectItem value="admin">Admin - Full access except ownership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleInvite}
                disabled={!inviteEmail || inviteLoading}
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
          <CardDescription>
            Users with access to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.user_id.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">User ID: {member.user_id.substring(0, 8)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {member.email || 'Email not available'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getRoleBadge(member.role)}
                  {userRole === 'owner' && member.role !== 'owner' && (
                    <div className="flex gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => handleRoleChange(member.user_id, newRole)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            What each role can do in this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="bg-purple-100 text-purple-800 mt-0.5">Owner</Badge>
            <p className="text-sm">Full access including workspace deletion, billing, and user management</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-blue-100 text-blue-800 mt-0.5">Admin</Badge>
            <p className="text-sm">Can manage users, PRDs, and settings (except billing and ownership)</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-green-100 text-green-800 mt-0.5">Editor</Badge>
            <p className="text-sm">Can create, edit, and delete PRDs</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">Viewer</Badge>
            <p className="text-sm">Read-only access to PRDs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
