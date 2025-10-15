# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRD Builder Pro is an AI-powered PRD (Product Requirements Document) generator that creates platform-specific product requirements documents for different development platforms (Replit, Bolt.new, Leap.new, and Lovable). The application uses OpenAI's GPT-4 to generate comprehensive PRDs based on user inputs.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Supabase (Authentication + PostgreSQL database)
- Stripe (Billing/Subscriptions)
- OpenAI API (PRD generation)
- Tailwind CSS + Radix UI components
- Zustand (State management)
- React Query (Data fetching)

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run postinstall  # Generate Prisma client (runs automatically after npm install)
```

Note: This project uses Supabase for the database. The schema is managed via Supabase migrations located in `supabase/migrations/20240101000000_initial_schema.sql`.

## Architecture Overview

### Route Structure

The app uses Next.js App Router with route groups for organization:

- **`/src/app/(auth)/`** - Public authentication pages (login, signup)
  - Protected by middleware that redirects authenticated users

- **`/src/app/(app)/`** - Protected application pages (builder, library, pricing, billing)
  - Has a layout that checks authentication and redirects unauthenticated users to `/login`
  - Includes navigation header with links and logout functionality

- **`/src/app/api/`** - API routes
  - `POST /api/generate` - Generates PRDs using OpenAI API
  - `POST /api/auth/logout` - Handles user logout

- **`/src/app/auth/callback/`** - OAuth callback handler
  - Required for Supabase email/OAuth authentication flow
  - Exchanges auth code for session and redirects to `/builder`

### Authentication Flow

1. **Supabase SSR Setup**: Three client types are used depending on context:
   - `src/lib/supabase/client.ts` - Browser client for client components
   - `src/lib/supabase/server.ts` - Server client for server components/actions
   - `src/lib/supabase/middleware.ts` - Middleware helper for session refresh

2. **Middleware**: `src/middleware.ts` runs on all routes (except static files/API) to refresh auth sessions

3. **Auth Callback**: When users click email magic links or complete OAuth, they're redirected to `/auth/callback?code=xxx` which exchanges the code for a session

### Data Model & Multi-tenancy

The app uses a **workspace-based multi-tenant architecture**:

- **Workspaces**: Each workspace contains PRD documents
- **Workspace Members**: Users belong to workspaces with roles (owner/admin/editor/viewer)
- **PRD Documents**: Stored with version history in `prd_documents` and `prd_versions` tables
- **Platforms**: Dynamic platform registry (Replit, Bolt, Leap, Lovable) with configurable parameters
- **Row-Level Security (RLS)**: Supabase policies ensure users only access their workspace data

Key database entities:
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - User-workspace relationships with roles
- `prd_documents` - Generated PRDs with versioning
- `prd_versions` - Full version history
- `platforms` / `platform_params` - Dynamic platform configuration
- `billing_customers` / `subscriptions` - Stripe billing integration

## Project requirements

- Reference the product requirements document in `@docs/prd.md`.
- Per PRD section 8.5, implement the payment gateway integration.
- Ensure all features adhere to the user stories outlined in the PRD.


### PRD Generation Flow

1. User fills out form in `/builder` page with:
   - Product pitch, target users, core features
   - Data entities, design vibe
   - Platform selection (each platform has custom parameters)
   - Optional: Include Stripe billing blueprint

2. Form submits to `POST /api/generate` which:
   - Validates user permissions (must be editor+ in workspace)
   - Builds a detailed prompt using `src/lib/prd/prompt-builder.ts`
   - Calls OpenAI GPT-4 API with the prompt
   - Parses response and extracts product name
   - Saves PRD to database with version history

3. User redirected to `/editor/[id]` to view/edit generated PRD

### State Management

- **Zustand Store** (`src/store/workspace.ts`): Persists active workspace selection
- **React Query**: Used for server state management (PRD fetching, mutations)
- **Supabase Realtime**: Can be used for live collaboration (not yet implemented)

### Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **shadcn/ui pattern**: Components in `src/components/ui/` follow shadcn conventions
- **Custom utilities**: `src/lib/utils.ts` contains `cn()` helper for className merging

### Type Safety

- **TypeScript strict mode** enabled
- **Database types**: Generated from Supabase schema (should be in `src/types/database.ts`)
- **PRD types**: Domain types in `src/types/prd.ts` map to database types
- **Zod validation**: API routes use Zod schemas for runtime validation

## Configuration Files

### Environment Variables (.env)

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (for admin operations)
STRIPE_SECRET_KEY=               # Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Stripe publishable key
STRIPE_WEBHOOK_SECRET=           # Stripe webhook signing secret
NEXT_PUBLIC_APP_URL=             # App URL (e.g., http://localhost:3000)
OPENAI_API_KEY=                  # OpenAI API key for PRD generation
```

### next.config.js

- Server Actions are enabled by default in Next.js 14 (no experimental flag needed)
- Configured image domains for external images (e.g., GitHub avatars)

### Supabase Setup

- **Redirect URL**: Must configure `http://localhost:3000/auth/callback` in Supabase dashboard under Authentication → URL Configuration
- **Migrations**: Schema defined in `supabase/migrations/20240101000000_initial_schema.sql`

## Key Implementation Patterns

### Server Components vs Client Components

- Default to Server Components for data fetching (can directly access Supabase)
- Use Client Components only when needed (interactivity, hooks, browser APIs)
- Layouts check authentication server-side before rendering

### API Route Authentication

All API routes must:
1. Create Supabase client
2. Call `supabase.auth.getUser()` to verify authentication
3. Check workspace membership and permissions
4. Return 401/403 for unauthorized access

Example pattern from `/api/generate`:
```typescript
const supabase = createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Dynamic Platform Configuration

Platforms and their parameters are stored in the database, not hardcoded. The UI should:
1. Fetch platforms from `platforms` table
2. Fetch parameters for selected platform from `platform_params` table
3. Dynamically render form fields based on parameter type (text/select/multiselect/boolean)
4. Include platform-specific guidance in PRD generation prompts

### PRD Prompt Engineering

The `buildPRDPrompt()` function in `src/lib/prd/prompt-builder.ts`:
- Takes platform, form data, and builds a comprehensive prompt
- Includes platform-specific implementation notes
- Optionally includes Stripe billing blueprint section
- Generates structured PRD with: problem/users, features, data model, acceptance criteria, implementation tasks
- Tailored to each platform's conventions and deployment model

## Common Gotchas

1. **Supabase Client Context**: Always use the correct Supabase client:
   - Server Components/API Routes: `createServerSupabaseClient()` from `server.ts`
   - Client Components: `createClient()` from `client.ts`
   - Never import the wrong one

2. **Auth Callback Route**: If users report 404 on auth links, verify `/auth/callback/route.ts` exists and Supabase redirect URLs are configured

3. **RLS Policies**: If database queries fail with permission errors, check:
   - User is authenticated (`auth.uid()` returns valid user)
   - User is member of the workspace being accessed
   - User has appropriate role for the operation

4. **OpenAI API Key**: PRD generation will fail if `OPENAI_API_KEY` is not set or invalid

5. **Workspace Context**: Most operations require an active workspace. The app uses Zustand to persist workspace selection, but always validate workspace membership server-side

## Testing Considerations

- No test framework currently configured
- When adding tests, consider:
  - API route tests with mocked Supabase/OpenAI clients
  - Component tests for forms and UI interactions
  - E2E tests for critical user flows (signup → generate PRD → view)

## Deployment Notes

- Built for Vercel deployment (Next.js platform)
- Requires environment variables configured in Vercel dashboard
- Prisma generates client on build (`postinstall` script)
- Supabase migrations should be run separately (not part of app build)
- Stripe webhooks need public endpoint configured (not localhost)
