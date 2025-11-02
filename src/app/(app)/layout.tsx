import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WorkspaceInitializer } from '@/components/workspace-initializer'
import { MobileNav } from '@/components/mobile-nav'
import { isAppAdmin } from '@/lib/auth/admin'
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

  // Check if user is an app-level admin (not workspace admin)
  const isAdmin = await isAppAdmin()

  return (
    <div className="min-h-screen flex flex-col">
      <WorkspaceInitializer />
      {/* App Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Mobile Menu */}
            <div className="flex items-center gap-3 md:hidden">
              <MobileNav isAdmin={isAdmin} signOutAction={signOut} />
              <Link href="/" className="text-lg font-bold">
                PRD Builder Pro
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-xl font-bold whitespace-nowrap">
                PRD Builder Pro
              </Link>
              <div className="flex gap-4 lg:gap-6 flex-wrap">
                <Link href="/builder" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  PRD Builder
                </Link>
                <Link href="/library" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  PRD Library
                </Link>
                <Link href="/ai-builder" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  AI Builder
                </Link>
                <Link href="/ai-instructions" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  AI Library
                </Link>
                <Link href="/pricing" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  Pricing
                </Link>
                <Link href="/billing" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                  Billing
                </Link>
                {isAdmin && (
                  <Link href="/admin/billing" className="text-sm font-medium hover:text-primary whitespace-nowrap">
                    Admin
                  </Link>
                )}
              </div>
            </div>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
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

            {/* Mobile User Actions - Just Account icon */}
            <div className="flex md:hidden">
              <Link href="/account">
                <Button variant="ghost" size="sm">
                  Account
                </Button>
              </Link>
            </div>
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
