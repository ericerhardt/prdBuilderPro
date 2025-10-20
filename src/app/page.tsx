import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            PRD Builder Pro
          </Link>
          <div className="flex gap-4">
            {user ? (
              <>
                <Link href="/builder">
                  <Button>New PRD</Button>
                </Link>
                <Link href="/library">
                  <Button variant="outline">Library</Button>
                </Link>
                <Link href="/account">
                  <Button variant="ghost">Account</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-5xl font-bold mb-6">
            Generate Platform-Specific PRDs in Minutes
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered PRD generator that creates tailored product requirements documents
            for Replit, Bolt.new, Leap.new, and Lovable. Save hours translating ideas
            into build-ready specs.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={user ? "/builder" : "/signup"}>
              <Button size="lg">
                {user ? "Create PRD" : "Start Free Trial"}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Build Faster
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Platform-Specific</h3>
              <p className="text-muted-foreground">
                Dynamic parameters and conventions for each platform, ensuring your
                PRDs match the exact requirements.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Stripe Ready</h3>
              <p className="text-muted-foreground">
                Built-in subscription blueprint with complete Stripe integration,
                webhooks, and admin analytics.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Export to Any Model</h3>
              <p className="text-muted-foreground">
                Generate model-ready markdown with implementation tasks, ready to
                paste into your favorite model.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 PRD Builder Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
