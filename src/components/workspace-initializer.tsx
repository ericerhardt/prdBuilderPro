'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'

export function WorkspaceInitializer() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Don't re-initialize if already set
    if (initialized || activeWorkspace) return

    const initializeWorkspace = async () => {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          console.error('Auth error:', authError)
          setInitialized(true)
          return
        }

        // Fetch user's workspace memberships
        const { data: memberships, error } = await supabase
          .from('workspace_members')
          .select(`
            role,
            workspace:workspaces (
              id,
              name,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching workspaces:', error)
          setInitialized(true)
          return
        }

        // Set the first workspace as active
        if (memberships && memberships.length > 0) {
          const firstMembership = memberships[0]
          const workspace = firstMembership.workspace as any

          if (workspace) {
            console.log('Initializing workspace:', workspace.name)
            setActiveWorkspace(workspace, firstMembership.role)
          }
        } else {
          console.warn('No workspaces found for user')
        }
      } catch (error) {
        console.error('Error initializing workspace:', error)
      } finally {
        setInitialized(true)
      }
    }

    initializeWorkspace()
  }, [setActiveWorkspace, activeWorkspace, initialized])

  return null
}
