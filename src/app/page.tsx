import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FileText, Code2, Zap, Sparkles, Users, Shield, GitBranch, Layers } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PRD Builder Pro
          </Link>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <Link href="/builder">
                  <Button>New PRD</Button>
                </Link>
                <Link href="/ai-builder">
                  <Button variant="outline">AI Instructions</Button>
                </Link>
                <Link href="/library">
                  <Button variant="ghost">Library</Button>
                </Link>
                <Link href="/account">
                  <Button variant="ghost">Account</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/pricing">
                  <Button variant="ghost">Pricing</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started Free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Two Powerful AI Tools in One Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Ship Faster with AI-Powered Documentation
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Generate production-ready PRDs and AI agent instructions in minutes.
            Support for 10+ platforms including Replit, Bolt, Claude Code, Cursor, and more.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={user ? "/builder" : "/signup"}>
              <Button size="lg" className="gap-2">
                <FileText className="w-5 h-5" />
                {user ? "Create PRD" : "Start Free Trial"}
              </Button>
            </Link>
            <Link href={user ? "/ai-builder" : "/signup"}>
              <Button size="lg" variant="outline" className="gap-2">
                <Code2 className="w-5 h-5" />
                {user ? "Build AI Instructions" : "Try AI Builder"}
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 3 free documents per month
          </p>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-12 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-md">
          <div className="relative w-full pb-[177.78%] overflow-hidden rounded-lg shadow-xl border">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://app.heygen.com/embedded-player/e5b5a3601d7a4e4caea3972a04e9a75d"
              title="HeyGen video player"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Two Products Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Two Essential Tools for Modern Development
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Whether you're building products or optimizing AI workflows, we've got you covered
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {/* PRD Generator */}
            <div className="border rounded-lg p-8 bg-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">PRD Generator</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Create platform-specific Product Requirements Documents tailored to your development platform's conventions and best practices.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">4 Development Platforms</div>
                    <div className="text-sm text-muted-foreground">Replit, Bolt.new, Leap.new, Lovable</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Stripe Billing Blueprint</div>
                    <div className="text-sm text-muted-foreground">Auto-generate SaaS subscription implementation</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Export to Markdown</div>
                    <div className="text-sm text-muted-foreground">Ready for Claude Code, Cursor, or any AI</div>
                  </div>
                </div>
              </div>
              <Link href={user ? "/builder" : "/signup"}>
                <Button className="w-full" variant="outline">
                  Create PRD
                </Button>
              </Link>
            </div>

            {/* AI Instruction Builder */}
            <div className="border rounded-lg p-8 bg-card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Code2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">AI Instruction Builder</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Generate optimized AI agent instructions, system prompts, sub-agents, skills, and configuration files for any AI coding platform.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">6 AI Platforms Supported</div>
                    <div className="text-sm text-muted-foreground">Claude Code, Cursor, Aider, Windsurf, Copilot, Custom</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">7 Instruction Types</div>
                    <div className="text-sm text-muted-foreground">Prompts, Sub-Agents, Skills, MCP, Commands, Workflows</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Production-Ready Files</div>
                    <div className="text-sm text-muted-foreground">Correct formats: CLAUDE.md, .cursorrules, .yml</div>
                  </div>
                </div>
              </div>
              <Link href={user ? "/ai-builder" : "/signup"}>
                <Button className="w-full">
                  Build AI Instructions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI Instruction Features Deep Dive */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Advanced AI Agent Configuration
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Build sophisticated AI workflows with specialized instruction types
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border rounded-lg p-6">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">System Prompts</h3>
              <p className="text-sm text-muted-foreground">
                Define AI agent identity, expertise, constraints, and behavioral guidelines
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Sub-Agents</h3>
              <p className="text-sm text-muted-foreground">
                Create specialized task agents with defined scope, triggers, and success criteria
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <p className="text-sm text-muted-foreground">
                Build reusable capabilities with input/output schemas and error handling
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">MCP Connectors</h3>
              <p className="text-sm text-muted-foreground">
                Configure Model Context Protocol integrations for filesystem, GitHub, Slack, and more
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            10+ Platforms Supported
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Platform-specific conventions, parameters, and best practices built in
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Development Platforms
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div>
                    <div className="font-medium">Replit</div>
                    <div className="text-sm text-muted-foreground">Node/Express, Replit DB, Nix deployment</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <div className="font-medium">Bolt.new</div>
                    <div className="text-sm text-muted-foreground">Next.js/Remix, Supabase, Vercel hosting</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <div>
                    <div className="font-medium">Leap.new</div>
                    <div className="text-sm text-muted-foreground">AI-powered with MCP connectors</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-pink-500" />
                  <div>
                    <div className="font-medium">Lovable</div>
                    <div className="text-sm text-muted-foreground">Full-stack with GitHub integration</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                AI Coding Platforms
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <div>
                    <div className="font-medium">Claude Code</div>
                    <div className="text-sm text-muted-foreground">MCP servers, sub-agents, skills, CLAUDE.md</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <div>
                    <div className="font-medium">Cursor</div>
                    <div className="text-sm text-muted-foreground">.cursorrules, composer mode, inline editing</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <div className="font-medium">Aider</div>
                    <div className="text-sm text-muted-foreground">Terminal pair programming, .aider.conf.yml</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div>
                    <div className="font-medium">Windsurf, Copilot & More</div>
                    <div className="text-sm text-muted-foreground">Cascade, Flows, copilot-instructions.md</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Everything You Need to Ship Faster
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Generation</h3>
              <p className="text-muted-foreground">
                GPT-4 powered intelligent generation with platform-specific conventions, best practices, and implementation details
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Version Control</h3>
              <p className="text-muted-foreground">
                Full version history for all documents. Track changes, compare versions, and never lose work
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Workspace-based multi-tenancy with role-based access control. Share with your team securely
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Enterprise Ready</h3>
              <p className="text-muted-foreground">
                Row-level security, audit logs, SSO/SAML support, and SLA guarantees for Business tier
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <Layers className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Dynamic Configuration</h3>
              <p className="text-muted-foreground">
                Admin-managed platform registry. Add new platforms without code changes. Always up to date
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Production Ready</h3>
              <p className="text-muted-foreground">
                Export with correct file extensions and formats. Copy to clipboard or download instantly
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Ship Faster?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join developers who are accelerating their workflow with AI-powered documentation
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Start Free Trial
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Free tier includes 3 documents per month • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-secondary/20">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                PRD Builder Pro
              </Link>
              <p className="text-sm text-muted-foreground mt-2">
                AI-powered PRD and instruction generation for modern development
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/builder" className="hover:text-foreground transition-colors">PRD Generator</Link></li>
                <li><Link href="/ai-builder" className="hover:text-foreground transition-colors">AI Instruction Builder</Link></li>
                <li><Link href="/library" className="hover:text-foreground transition-colors">Document Library</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
                <li><Link href="/support" className="hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 PRD Builder Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
