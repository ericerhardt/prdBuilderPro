import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAppAdmin } from '@/lib/auth/admin'
import { Shield } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side check for app-level admin access
  const isAdmin = await isAppAdmin()

  if (!isAdmin) {
    // This should rarely happen since middleware also protects,
    // but it's a defense-in-depth measure
    redirect('/builder?error=unauthorized')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Application Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage application-wide settings, billing analytics, and platform configuration
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
            <TabsTrigger value="platforms">PRD Platforms</TabsTrigger>
          </Link>
          <Link href="/admin/ai-platforms">
            <TabsTrigger value="ai-platforms">AI Platforms</TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
}
