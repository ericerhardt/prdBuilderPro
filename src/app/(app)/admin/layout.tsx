'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWorkspaceStore } from '@/store/workspace'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Shield } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { activeWorkspace, userRole } = useWorkspaceStore()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAuthorization()
  }, [activeWorkspace, userRole])

  const checkAuthorization = async () => {
    if (!activeWorkspace) {
      router.push('/builder')
      return
    }

    // Check if user has admin or owner role
    if (userRole !== 'owner' && userRole !== 'admin') {
      // Double check from database
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', user.id)
        .single()

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        router.push('/builder')
        return
      }
    }

    setAuthorized(true)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your workspace, users, and analytics
        </p>
      </div>

      <Tabs defaultValue="billing" className="mb-6">
        <TabsList>
          <Link href="/admin/billing">
            <TabsTrigger value="billing">Billing Analytics</TabsTrigger>
          </Link>
          <Link href="/admin/users">
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
          </Link>
          <Link href="/admin/prds">
            <TabsTrigger value="prds">PRD Library</TabsTrigger>
          </Link>
          <Link href="/admin/platforms">
            <TabsTrigger value="platforms">Platform Config</TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
}
