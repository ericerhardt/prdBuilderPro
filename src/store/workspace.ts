import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Workspace, WorkspaceMember } from '@/types/prd'

interface WorkspaceStore {
  activeWorkspace: Workspace | null
  userRole: WorkspaceMember['role'] | null
  setActiveWorkspace: (workspace: Workspace, role: WorkspaceMember['role']) => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeWorkspace: null,
      userRole: null,
      setActiveWorkspace: (workspace, role) => set({ activeWorkspace: workspace, userRole: role }),
      clearWorkspace: () => set({ activeWorkspace: null, userRole: null }),
    }),
    {
      name: 'workspace-storage',
    }
  )
)
