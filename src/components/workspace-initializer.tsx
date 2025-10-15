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

        // If no workspaces exist, try to create one
        if (!memberships || memberships.length === 0) {
          console.log('No workspace found, attempting to create one...')

          try {
            const response = await fetch('/api/workspace/create', {
              method: 'POST',
            })

            if (response.ok) {
              const result = await response.json()
              console.log('Created workspace:', result.workspace)

              // Fetch workspaces again
              const { data: newMemberships, error: refetchError } = await supabase
                .from('workspace_members')
                .select(`
                  role,
                  workspace:workspaces (
                    id,
                    name,
                    created_at,
                    created_by
                  )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

              if (!refetchError && newMemberships && newMemberships.length > 0) {
                const firstMembership = newMemberships[0]
                const workspace = firstMembership.workspace as any

                if (workspace) {
                  console.log('Initializing newly created workspace:', workspace.name)
                  setActiveWorkspace(workspace, firstMembership.role)
                }
              }
            } else {
              console.error('Failed to create workspace:', await response.text())
            }
          } catch (createError) {
            console.error('Error creating workspace:', createError)
          }
        } else {
          // Set the first workspace as active
          const firstMembership = memberships[0]
          const workspace = firstMembership.workspace as any

          if (workspace) {
            console.log('Initializing workspace:', workspace.name)
            setActiveWorkspace(workspace, firstMembership.role)
          }
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
