import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WorkspaceInitializer } from '@/components/workspace-initializer'
import { signOut } from './actions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has admin access
  const { data: workspaceMemberships } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', user.id)

  const isAdmin = workspaceMemberships?.some(
    (membership) => membership.role === 'owner' || membership.role === 'admin'
  )

  return (
    <div className="min-h-screen flex flex-col">
      <WorkspaceInitializer />
      {/* App Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              PRD Builder Pro
            </Link>
            <div className="flex gap-6">
              <Link href="/builder" className="text-sm font-medium hover:text-primary">
                Builder
              </Link>
              <Link href="/library" className="text-sm font-medium hover:text-primary">
                Library
              </Link>
              <Link href="/pricing" className="text-sm font-medium hover:text-primary">
                Pricing
              </Link>
              <Link href="/billing" className="text-sm font-medium hover:text-primary">
                Billing
              </Link>
              {isAdmin && (
                <Link href="/admin/billing" className="text-sm font-medium hover:text-primary">
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/account">
              <Button variant="ghost" size="sm">
                Account
              </Button>
            </Link>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
